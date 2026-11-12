export type InstallPlatform = "ios" | "android" | "desktop";

export function detectInstallPlatform(input: {
  userAgent: string;
  platform?: string;
  maxTouchPoints?: number;
}): InstallPlatform {
  const ua = input.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (input.platform === "MacIntel" && (input.maxTouchPoints ?? 0) > 1) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

export function isInAppBrowser(userAgent: string): boolean {
  return /FBAN|FBAV|Instagram|Line\/|Twitter|Snapchat/i.test(userAgent);
}

export function isStandaloneDisplay(input: { mediaStandalone: boolean; navigatorStandalone?: boolean }): boolean {
  return input.mediaStandalone || input.navigatorStandalone === true;
}
