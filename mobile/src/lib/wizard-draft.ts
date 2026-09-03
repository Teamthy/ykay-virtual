import AsyncStorage from "@react-native-async-storage/async-storage";

// First-time onboarding wizard draft — persisted across the three wizard
// routes (/wizard → /wizard/profile → /wizard/goals) so a user can step
// backwards and forwards without losing input, and the next user always
// starts fresh (draft cleared on finish).

export type WizardDraft = {
  role: string | null;
  firstName: string;
  level: string;
  goals: string[];
};

const KEY = "ykv_wizard_draft";

export const LEVELS = [
  "Primary",
  "JSS1",
  "JSS2",
  "JSS3",
  "SSS1",
  "SSS2",
  "SSS3",
  "IGCSE",
  "A Level",
] as const;

export const TUTOR_SUBJECTS = [
  "Mathematics",
  "English",
  "Sciences",
  "Computer Science",
  "Exam Prep",
] as const;

export const GOALS = [
  {
    id: "exams",
    label: "Exam success (UTME · IGCSE · WAEC)",
    icon: "create-outline",
  },
  { id: "grades", label: "Better school grades", icon: "trending-up-outline" },
  {
    id: "confidence",
    label: "Confidence & study habits",
    icon: "fitness-outline",
  },
  { id: "abroad", label: "Studying abroad", icon: "airplane-outline" },
  { id: "digital", label: "Digital & tech skills", icon: "laptop-outline" },
] as const;

export function emptyDraft(): WizardDraft {
  return { role: null, firstName: "", level: "", goals: [] };
}

export async function getDraft(): Promise<WizardDraft> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return emptyDraft();
    const parsed = JSON.parse(raw) as Partial<WizardDraft>;
    return {
      role: parsed.role ?? null,
      firstName: parsed.firstName ?? "",
      level: parsed.level ?? "",
      goals: Array.isArray(parsed.goals) ? parsed.goals : [],
    };
  } catch {
    return emptyDraft();
  }
}

export async function setDraft(draft: WizardDraft): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    // storage failures must not block onboarding
  }
}

export async function clearDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
