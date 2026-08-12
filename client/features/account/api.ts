import { apiFetch } from "@/lib/api";

// Account hub API (phase 37).

export type Device = {
  id: string;
  user_id: string;
  token: string;
  platform: string;
  app_version?: string;
  last_seen_at: string;
  created_at: string;
};

export async function listDevices(): Promise<Device[]> {
  const res = await apiFetch<Device[]>("/me/devices");
  return res.data ?? [];
}

export async function removeDevice(id: string): Promise<void> {
  await apiFetch(`/me/devices/${id}`, { method: "DELETE" });
}
