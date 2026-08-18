import * as Updates from "expo-updates";

// OTA update helper — checks for a newer JS bundle published via `eas update`,
// and exposes the current app version. Used by:
//   - root layout: check-on-launch + auto-apply
//   - a prompt: "Update available — restart to apply" (non-intrusive)
//   - Profile: show the installed version
//
// Only meaningful in production/preview builds that embed expo-updates; in dev
// builds `Updates.isEnabled` is false and everything degrades to no-ops.

export type UpdateCheckResult = {
  isEnabled: boolean;
  updateAvailable: boolean;
  currentVersion: string;
};

// The installed JS bundle version (e.g. "0.1.0"), or a fallback.
export function currentAppVersion(): string {
  try {
    return Updates.createdAt?.toISOString()?.slice(0, 10) || "0.1.0";
  } catch {
    return "0.1.0";
  }
}

// Fetch (download) an available update WITHOUT reloading, so the UI can show
// an explicit "Restart to apply" prompt. Returns true if an update was found
// and downloaded.
export async function fetchUpdate(): Promise<{ available: boolean; downloaded: boolean; updateId?: string }> {
  try {
    if (!Updates.isEnabled) return { available: false, downloaded: false };
    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable) return { available: false, downloaded: false };
    await Updates.fetchUpdateAsync();
    return { available: true, downloaded: true };
  } catch {
    return { available: false, downloaded: false };
  }
}

// Apply a downloaded update by reloading into the new bundle.
export async function applyUpdate(): Promise<void> {
  try {
    await Updates.reloadAsync();
  } catch {
    // ignore — reload failures are non-fatal
  }
}

// One-shot convenience: check, fetch, and reload immediately (used on launch).
export async function checkForUpdates(): Promise<void> {
  const { available, downloaded } = await fetchUpdate();
  if (available && downloaded) {
    await applyUpdate();
  }
}
