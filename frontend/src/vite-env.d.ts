/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_ADSENSE_ENABLED: string;
  readonly VITE_ADSENSE_CLIENT_ID: string;
  readonly VITE_ADSENSE_MODE: string;
  readonly VITE_ADSENSE_REQUIRE_CONSENT: string;
  readonly VITE_ADSENSE_SLOT_HEADER: string;
  readonly VITE_ADSENSE_SLOT_WORKSPACE: string;
  readonly VITE_ADSENSE_SLOT_MID: string;
  readonly VITE_ADSENSE_SLOT_FOOTER: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
