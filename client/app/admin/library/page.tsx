"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { listAdminLibrary, updateLibraryMeta, type LibraryItem } from "@/features/library/api";
import { formatDuration } from "@/lib/format";

function Row({ item }: { item: LibraryItem }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [thumb, setThumb] = useState(item.thumbnail_url ?? "");
  const [dur, setDur] = useState(item.duration_seconds ? String(item.duration_seconds) : "");
  const [sort, setSort] = useState(String(item.sort_order ?? 0));

  const mutate = useMutation({
    mutationFn: (input: Parameters<typeof updateLibraryMeta>[1]) => updateLibraryMeta(item.lesson_id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "library"] });
      setEditing(false);
    },
  });

  const toggle = (key: "visible" | "featured") =>
    mutate.mutate({ [key]: !item[key] });

  const save = () => {
    const input: Parameters<typeof updateLibraryMeta>[1] = {};
    const dv = parseInt(dur, 10);
    const sv = parseInt(sort, 10);
    if (thumb !== (item.thumbnail_url ?? "")) input.thumbnail_url = thumb || "";
    if (!Number.isNaN(dv) && dv >= 0) input.duration_seconds = dv;
    if (!Number.isNaN(sv) && sv >= 0) input.sort_order = sv;
    mutate.mutate(input);
  };

  return (
    <tr className="border-t border-ink-100 hover:bg-ink-50/50">
      <td className="px-4 py-3">
        <div className="font-semibold">{item.title}</div>
        <div className="text-xs text-ink-500">
          {item.programme_title ?? "No programme"} {item.level_name ? `· ${item.level_name}` : ""}
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-ink-500">
        {item.cohort_title ?? "-"}
      </td>
      <td className="px-4 py-3 text-xs text-ink-500">
        {item.duration_seconds ? formatDuration(item.duration_seconds) : "-"}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => toggle("visible")}
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              item.visible ? "bg-green-100 text-green-800" : "bg-ink-100 text-ink-500"
            }`}
          >
            {item.visible ? "Visible" : "Hidden"}
          </button>
          <button
            type="button"
            onClick={() => toggle("featured")}
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              item.featured ? "bg-brand-gold text-deep" : "bg-ink-100 text-ink-500"
            }`}
          >
            {item.featured ? "Featured" : "Not featured"}
          </button>
        </div>
      </td>
      <td className="px-4 py-3">
        {editing ? (
          <div className="flex flex-col gap-2 text-xs">
            <input
              value={thumb}
              onChange={(e) => setThumb(e.target.value)}
              placeholder="Thumbnail URL"
              className="w-56 rounded-lg border border-ink-200 px-2 py-1"
            />
            <div className="flex gap-2">
              <input
                value={dur}
                onChange={(e) => setDur(e.target.value)}
                placeholder="seconds"
                className="w-24 rounded-lg border border-ink-200 px-2 py-1"
              />
              <input
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                placeholder="order"
                className="w-20 rounded-lg border border-ink-200 px-2 py-1"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={save} disabled={mutate.isPending}>
                {mutate.isPending ? "Saving…" : "Save"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
      </td>
    </tr>
  );
}

export default function AdminLibraryPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["admin", "library", q, page],
    queryFn: () => listAdminLibrary({ q: q || undefined, page, page_size: 20 }),
    staleTime: 30_000,
  });

  const rows = query.data?.data ?? [];
  const meta = query.data?.meta;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">Recorded Lesson Library</h1>
        <p className="mt-1 text-sm text-ink-500">
          Curate which recorded lessons appear in the on-demand library. Toggle visibility/featured and set
          thumbnail, duration and ordering.
        </p>
      </div>

      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setPage(1);
        }}
        placeholder="Search lessons…"
        className="w-full max-w-sm rounded-xl border border-ink-200 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
      />

      {query.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Video size={20} />}
          title="No recorded lessons"
          description="Lessons with a video URL appear here so you can add them to the library."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-ink-50 text-left text-xs text-ink-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Lesson</th>
                <th className="px-4 py-3 font-semibold">Cohort</th>
                <th className="px-4 py-3 font-semibold">Duration</th>
                <th className="px-4 py-3 font-semibold">Curation</th>
                <th className="px-4 py-3 font-semibold">Meta</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((it) => (
                <Row key={it.lesson_id} item={it} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.total_pages > 1 && (
        <div className="flex justify-center gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Prev
          </Button>
          <span className="self-center text-sm text-ink-500">
            Page {meta.page} / {meta.total_pages}
          </span>
          <Button size="sm" variant="outline" disabled={!meta.has_next} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
