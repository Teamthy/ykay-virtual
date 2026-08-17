import AsyncStorage from "@react-native-async-storage/async-storage";

// Saved tutors (wishlist) — device-local, mirroring the web wishlist
// (client/features/wishlist/hook.ts). A server-side wishlist keyed on the
// session user is the documented follow-up; until then this is stored on this
// device only.

export type SavedTutor = {
  slug: string;
  name: string;
  subjects: string[];
  rating: number;
};

const KEY = "nuvora-saved-tutors";

export async function readSaved(): Promise<SavedTutor[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedTutor[]) : [];
  } catch {
    return [];
  }
}

async function write(list: SavedTutor[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // storage failures are non-fatal
  }
}

export async function isSaved(slug: string): Promise<boolean> {
  const list = await readSaved();
  return list.some((t) => t.slug === slug);
}

export async function toggleSaved(tutor: SavedTutor): Promise<SavedTutor[]> {
  const prev = await readSaved();
  const next = prev.some((t) => t.slug === tutor.slug)
    ? prev.filter((t) => t.slug !== tutor.slug)
    : [...prev, tutor];
  await write(next);
  return next;
}

export async function removeSaved(slug: string): Promise<SavedTutor[]> {
  const next = (await readSaved()).filter((t) => t.slug !== slug);
  await write(next);
  return next;
}
