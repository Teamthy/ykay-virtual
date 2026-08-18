import { File, Paths } from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Offline video caching (expo-file-system v19) — download a lesson video to
// the device so it plays without a network connection. Tracks cached URIs in
// AsyncStorage so the UI can show "Downloaded" and reuse the local file.

const INDEX_KEY = "offline:videos";

type CachedVideo = { lessonId: string; uri: string; source: string; at: number };

async function getIndex(): Promise<CachedVideo[]> {
  try {
    const raw = await AsyncStorage.getItem(INDEX_KEY);
    return raw ? (JSON.parse(raw) as CachedVideo[]) : [];
  } catch {
    return [];
  }
}

export async function isVideoCached(lessonId: string): Promise<boolean> {
  const idx = await getIndex();
  return idx.some((v) => v.lessonId === lessonId);
}

export async function getCachedVideoUri(lessonId: string): Promise<string | null> {
  const idx = await getIndex();
  const found = idx.find((v) => v.lessonId === lessonId);
  if (!found) return null;
  try {
    const f = new File(found.uri);
    return f.exists ? found.uri : null;
  } catch {
    return null;
  }
}

// Download a video for offline playback. Returns the local uri (or null on
// failure). Downloads are best-effort and non-blocking.
export async function cacheVideo(lessonId: string, sourceUrl: string): Promise<string | null> {
  try {
    const dir = Paths.document; // persistent storage
    const extMatch = sourceUrl.match(/\.(\w{2,4})(?:\?|$)/);
    const ext = extMatch ? `.${extMatch[1]}` : ".mp4";
    const file = await File.downloadFileAsync(sourceUrl, dir, { idempotent: true });
    const uri = file.uri;
    const idx = await getIndex();
    const next = idx.filter((v) => v.lessonId !== lessonId).concat({ lessonId, uri, source: sourceUrl, at: Date.now() });
    await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(next));
    return uri;
  } catch {
    return null;
  }
}

export async function removeCachedVideo(lessonId: string): Promise<void> {
  const idx = await getIndex();
  const found = idx.find((v) => v.lessonId === lessonId);
  if (found) {
    try {
      const f = new File(found.uri);
      if (f.exists) f.delete();
    } catch {
      // ignore
    }
  }
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(idx.filter((v) => v.lessonId !== lessonId)));
}
