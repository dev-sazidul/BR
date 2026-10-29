import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useEditorHistory } from "../hooks/useEditorHistory";
import { createSnapshot } from "../utils/imageGeometry";

describe("editor history", () => {
  it("undoes, redoes, and resets without copying image files", () => {
    const { result } = renderHook(() => useEditorHistory());
    const initial = createSnapshot(12, 8);
    act(() => result.current.boot(initial));
    act(() =>
      result.current.commit({
        ...initial,
        background: { type: "color", color: "#FFFFFF", presetId: "solid-white" },
      }),
    );
    expect(result.current.canUndo).toBe(true);
    act(() => result.current.undo());
    expect(result.current.present?.background.type).toBe("transparent");
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
    act(() => result.current.redo());
    expect(result.current.present?.background).toMatchObject({ type: "color", color: "#FFFFFF" });
    act(() => result.current.reset(initial));
    expect(result.current.present?.background.type).toBe("transparent");
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });
});
