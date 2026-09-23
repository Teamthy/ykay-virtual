import { apiFetch } from "@/lib/api";

export type DigestPrefs = {
  enabled: boolean;
  last_sent_at?: string;
};

/** My weekly parent progress digest preference (feature 3). */
export async function getDigestPrefs(): Promise<DigestPrefs> {
  const res = await apiFetch<DigestPrefs>("/me/digest-prefs");
  return res.data;
}

export async function setDigestPrefs(enabled: boolean): Promise<DigestPrefs> {
  const res = await apiFetch<DigestPrefs>("/me/digest-prefs", {
    method: "PUT",
    body: JSON.stringify({ enabled }),
  });
  return res.data;
}
