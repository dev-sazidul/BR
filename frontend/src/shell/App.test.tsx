import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";
import { navigationState } from "../test/navigation-state";
import { fetchHealth, fetchPublicConfig, removeBackground } from "../services/imageService";
import type { RemovalResult } from "../types/api";

vi.mock("../services/imageService", () => ({
  fetchPublicConfig: vi.fn(),
  fetchHealth: vi.fn(),
  removeBackground: vi.fn(),
}));

const config = {
  max_upload_bytes: 10 * 1024 * 1024,
  max_dimension_px: 4096,
  supported_formats: ["PNG", "JPEG", "WEBP"],
  output_formats: ["png", "jpeg"],
  ai_model: "u2net",
  contact_email: null as string | null,
};

const health = {
  status: "ok" as const,
  service: "solva",
  ai: {
    provider: "remover",
    model: "u2net",
    available: true,
    model_cached: true,
    detail: "ready",
  },
};

function renderAt(path = "/") {
  navigationState.pathname = path;
  return render(<App />);
}

describe("Solva app", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.mocked(fetchPublicConfig).mockResolvedValue(config);
    vi.mocked(fetchHealth).mockResolvedValue(health);
    vi.mocked(removeBackground).mockReset();
  });

  it("shows the upload limit from the server", async () => {
    renderAt();
    expect(screen.getByRole("heading", { name: "Remove Image Backgrounds in Seconds" })).toBeInTheDocument();
    expect(await screen.findByText(/up to 10 MB/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Browse image" })).toBeInTheDocument();
    expect(screen.getByText(/processed in memory and is not stored/)).toBeInTheDocument();
    expect(screen.getAllByRole("complementary", { name: "Advertisement" })).toHaveLength(4);
    expect(document.querySelector("script[data-solva-adsense]")).toBeNull();
    const dropzone = screen.getByText("Drag an image here").parentElement;
    expect(dropzone?.closest("[aria-label='Advertisement']")).toBeNull();
  });

  it("uploads an image, shows a processing state, then the cutout", async () => {
    const user = userEvent.setup();
    let resolveUpload: (value: RemovalResult) => void = () => undefined;
    vi.mocked(removeBackground).mockImplementation(
      () =>
        new Promise<RemovalResult>((resolve) => {
          resolveUpload = resolve;
        }),
    );

    renderAt();
    await screen.findByText(/up to 10 MB/);
    const input = screen.getByLabelText("Choose an image");
    const file = new File([new Uint8Array([1, 2, 3, 4])], "portrait.png", { type: "image/png" });
    await user.upload(input, file);

    expect(removeBackground).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("status")).toHaveTextContent(/Uploading and removing the background/);
    expect(screen.getByRole("button", { name: "Upload another" })).toBeDisabled();

    resolveUpload({ blob: new Blob(["png"], { type: "image/png" }), width: 32, height: 32 });

    expect(await screen.findByRole("img", { name: "Background removed" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Selected image" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit image" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Slider" }));
    expect(screen.getByRole("slider", { name: "Compare the original image and the cutout" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Download PNG" }));
  });

  it("shows an API failure and allows another try", async () => {
    const user = userEvent.setup();
    vi.mocked(removeBackground).mockRejectedValueOnce(
      new axios.AxiosError("bad", "ERR_BAD_RESPONSE", undefined, undefined, {
        data: { error: { code: "ai_unavailable", message: "The model is not installed.", details: {} } },
        status: 503,
        statusText: "Service Unavailable",
        headers: {},
        config: { headers: new axios.AxiosHeaders() },
      }),
    );
    renderAt();
    await screen.findByText(/up to 10 MB/);
    await user.upload(
      screen.getByLabelText("Choose an image"),
      new File([new Uint8Array([1, 2, 3])], "portrait.png", { type: "image/png" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("The model is not installed.");
    expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
  });

  it("rejects an unsupported file before calling the API", async () => {
    renderAt();
    await screen.findByText(/up to 10 MB/);
    const dropzone = screen.getByText("Drag an image here").parentElement;
    if (!dropzone) throw new Error("Dropzone was not found.");
    const file = new File(["hello"], "notes.txt", { type: "text/plain" });
    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });
    expect(await screen.findByRole("alert")).toHaveTextContent(/PNG, JPG, or WebP/);
    expect(removeBackground).not.toHaveBeenCalled();
  });

  it("explains that nothing is stored and how sign-in cookies work", async () => {
    renderAt("/privacy");
    expect(await screen.findByRole("heading", { name: "Privacy" })).toBeInTheDocument();
    expect(screen.getByText(/neither is the transparent result/i)).toBeInTheDocument();
    expect(screen.getByText(/cannot be read by scripts/i)).toBeInTheDocument();
    expect(screen.getByText(/Advertising is not configured/i)).toBeInTheDocument();
  });

  it("does not invent a contact form when no email is configured", async () => {
    renderAt("/contact");
    expect(await screen.findByText(/has not been published/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /send/i })).not.toBeInTheDocument();
  });

  it("opens the account menu without requiring a sign-in", async () => {
    const user = userEvent.setup();
    renderAt();
    await user.click(screen.getByRole("button", { name: "Account menu" }));
    expect(screen.queryByRole("menuitem", { name: "Profile" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Account settings" })).not.toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Create account" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menuitem", { name: "Sign in" })).not.toBeInTheDocument();
  });

  it("shows sourced portrait sizes and marks an unverified document", async () => {
    const user = userEvent.setup();
    renderAt("/portrait");
    expect(await screen.findByRole("heading", { name: "Portrait and passport photos" })).toBeInTheDocument();
    expect(screen.getByText(/does not certify/i)).toBeInTheDocument();
    expect(screen.getByText("Solva framing guide. This is not an official document size.")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Passport and ID" }));
    expect(screen.getByText("600 × 600 px")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Other background colour"), { target: { value: "#0000ff" } });
    expect(screen.getByText(/left as you chose it/i)).toBeInTheDocument();
    await user.click(screen.getByRole("option", { name: "Bangladesh" }));
    await user.selectOptions(screen.getByLabelText("Document type"), "Adult passport photo");
    expect(screen.getByText(/not an official Bangladesh passport size/i)).toBeInTheDocument();
    expect(screen.getByText(/Do not treat this size as officially compliant/i)).toBeInTheDocument();
  });

  it("rejects an invalid portrait upload before calling the API", async () => {
    renderAt("/portrait");
    await screen.findByRole("heading", { name: "Portrait and passport photos" });
    const dropzone = screen.getByText("Drag an image here").parentElement;
    if (!dropzone) throw new Error("Dropzone was not found.");
    fireEvent.drop(dropzone, { dataTransfer: { files: [new File(["hello"], "notes.txt", { type: "text/plain" })] } });
    expect(await screen.findByRole("alert")).toHaveTextContent(/PNG, JPG, or WebP/);
    expect(removeBackground).not.toHaveBeenCalled();
  });

  it("renders the not found page", async () => {
    renderAt("/missing");
    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
  });
});
