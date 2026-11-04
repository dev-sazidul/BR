import axios from "axios";
import { describe, expect, it } from "vitest";

import { getErrorMessage } from "./api";

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
