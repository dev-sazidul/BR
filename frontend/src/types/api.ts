export type PublicConfig = {
  max_upload_bytes: number;
  max_dimension_px: number;
  supported_formats: string[];
  output_formats: string[];
  ai_model: string | null;
  contact_email: string | null;
};

export type HealthResponse = {
  status: "ok" | "degraded";
  service: string;
  ai: {
    provider: string;
    model: string | null;
    available: boolean;
    model_cached: boolean;
    detail: string;
  };
};

/** The cutout itself. Nothing is kept on the server, so there is no link to it. */
export type RemovalResult = {
  blob: Blob;
  width: number;
  height: number;
};

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};

export const FALLBACK_CONFIG: PublicConfig = {
  max_upload_bytes: 10 * 1024 * 1024,
  max_dimension_px: 4096,
  supported_formats: ["PNG", "JPEG", "WEBP"],
  output_formats: ["png", "jpeg"],
  ai_model: null,
  contact_email: null,
};
