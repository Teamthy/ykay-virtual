import { apiFetch, Envelope } from "@/lib/api";

export type Programme = {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  description?: string;
  format: "COHORT" | "PRIVATE" | "BOOTCAMP" | "HOLIDAY" | "ONLINE_CLASS" | "HYBRID";
  status: string;
  price_min?: number;
  price_max?: number;
  currency: string;
  is_featured: boolean;
};

export type ProgrammeListParams = {
  search?: string;
  subject?: string;
  curriculum?: string;
  exam?: string;
  level?: string;
  format?: string;
  featured?: boolean;
  page?: number;
  page_size?: number;
  sort?: string;
};

export async function listProgrammes(params: ProgrammeListParams = {}): Promise<Envelope<Programme[]>> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  });
  return apiFetch<Programme[]>(`/programmes?${qs.toString()}`);
}
