import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdvancedImageEditor } from "./AdvancedImageEditor";

class FakeImage {
  naturalWidth = 40;
  naturalHeight = 20;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(_value: string) {
    setTimeout(() => this.onload?.(), 0);
  }
}

describe("AdvancedImageEditor", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("changes the background, compares, and undoes without a removal request", async () => {
    vi.stubGlobal("Image", FakeImage);
    const user = userEvent.setup();
    render(
      <AdvancedImageEditor
        originalUrl="original.png"
        foregroundUrl="cutout.png"
        fileName="portrait.png"
        maxBytes={1024}
        onClose={() => undefined}
      />,
    );

    expect(await screen.findByRole("button", { name: "Lush green garden" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Lush green garden" }));
    expect(screen.getByRole("button", { name: "Lush green garden" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByRole("button", { name: "Lush green garden" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();

    await user.click(screen.getByRole("tab", { name: "Beach" }));
    expect(screen.getByRole("button", { name: "Beautiful tropical beach" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Compare" }));
    expect(screen.getByRole("button", { name: "Editing" })).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Custom background" })[0]);
    const input = screen.getByLabelText("Background image");
    fireEvent.change(input, { target: { files: [new File(["nope"], "notes.txt", { type: "text/plain" })] } });
    expect(await screen.findByRole("alert")).toHaveTextContent(/PNG, JPG, or WebP/);
  });
});
