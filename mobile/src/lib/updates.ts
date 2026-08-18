import * as Updates from "expo-updates";

// OTA update helper — on launch (or on demand), check for a newer JS bundle
// published via `eas update`. If one exists, fetch it and reload so the user
// gets the latest features WITHOUT reinstalling the app (EAS Update).

export type UpdateCheckResult = { updateAvailable: boolean; downloaded: boolean };

export async function checkForUpdates(onChange?: (r: UpdateCheckResult) => void): Promise<UpdateCheckResult> {
  try {
    // Only meaningful in a production/preview build that embeds expo-updates;
    // in dev builds Updates.isEnabled is false and this is a no-op.
    if (!Updates.isEnabled) return { updateAvailable: false, downloaded: false };

    const update = await Updates.checkForUpdateAsync();
    if (!update.isAvailable) return { updateAvailable: false, downloaded: false };

    await Updates.fetchUpdateAsync();
    onChange?.({ updateAvailable: true, downloaded: true });

    // Prompt the user to apply (app reloads to the new bundle). Best-effort.
    await Updates.reloadAsync();
    return { updateAvailable: true, downloaded: true };
  } catch {
    return { updateAvailable: false, downloaded: false };
  }
}
