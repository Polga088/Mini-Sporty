export const PWA_IOS_HELP_DISMISSED_KEY = "mini-sporty:pwa-ios-help-dismissed";

export function isStandaloneDisplayMode(windowLike: Pick<Window, "matchMedia"> | undefined = typeof window !== "undefined" ? window : undefined) {
  if (!windowLike) return false;
  return windowLike.matchMedia("(display-mode: standalone)").matches;
}

export function isIosDevice(userAgent: string, platform: string, maxTouchPoints: number) {
  const isAppleTouchDevice = platform === "MacIntel" && maxTouchPoints > 1;
  return /iPad|iPhone|iPod/i.test(userAgent) || isAppleTouchDevice;
}

export function isIosSafari(userAgent: string, platform: string, maxTouchPoints: number) {
  if (!isIosDevice(userAgent, platform, maxTouchPoints)) return false;
  return /Safari/i.test(userAgent) && !/(CriOS|FxiOS|EdgiOS|OPiOS|Chrome)/i.test(userAgent);
}

export function formatInstallPromptError(error: unknown) {
  return error instanceof Error ? error.message : "Erreur inconnue";
}
