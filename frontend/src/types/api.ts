export type PublicConfig = {
  max_upload_bytes: number;
  max_dimension_px: number;
  supported_formats: string[];
  output_formats: string[];
  retention_minutes: number;
  ai_provider: string;
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

export type RemovalResult = {
  id: string;
  original_filename: string;
  width: number;
  height: number;
  output_format: string;
  result_url: string;
  download_url: string;
  expires_at: string;
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
  retention_minutes: 30,
  ai_provider: "rembg",
  ai_model: null,
  contact_email: null,
};
