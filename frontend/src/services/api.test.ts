import axios from "axios";
import { describe, expect, it } from "vitest";

import { apiBaseUrl, getErrorMessage } from "./api";

describe("apiBaseUrl", () => {
  it("keeps the host when the env value already includes /api/v1", () => {
    expect(apiBaseUrl("https://bg-background.vercel.app/api/v1")).toBe("https://bg-background.vercel.app");
    expect(apiBaseUrl("https://bg-background.vercel.app/api/v1/")).toBe("https://bg-background.vercel.app");
  });

  it("uses an empty base for same-origin requests", () => {
    expect(apiBaseUrl("")).toBe("");
    expect(apiBaseUrl(undefined)).toBe("");
  });
});

describe("getErrorMessage", () => {
  it("uses the API error message", () => {
    const error = new axios.AxiosError("bad");
    error.response = {
      data: { error: { code: "ai_unavailable", message: "The model is not installed.", details: {} } },
      status: 503,
      statusText: "Service Unavailable",
      headers: {},
      config: { headers: new axios.AxiosHeaders() },
    };
    expect(getErrorMessage(error)).toBe("The model is not installed.");
  });

  it("explains a missing server", () => {
    const error = new axios.AxiosError("network");
    expect(getErrorMessage(error)).toMatch(/Could not reach the server/);
  });
});
