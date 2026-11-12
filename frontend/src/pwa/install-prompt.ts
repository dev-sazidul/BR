export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;

export function getInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferred;
}

export function setInstallPrompt(event: BeforeInstallPromptEvent | null): void {
  deferred = event;
  window.dispatchEvent(new Event("solva-install-prompt"));
}

export function markInstalled(): void {
  installed = true;
  deferred = null;
  window.dispatchEvent(new Event("solva-install-prompt"));
}

export function wasInstalled(): boolean {
  return installed;
}

export function clearInstallPrompt(): void {
  deferred = null;
  window.dispatchEvent(new Event("solva-install-prompt"));
}
