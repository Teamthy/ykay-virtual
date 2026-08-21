"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  createAdminPost,
  listAdminPosts,
  setAdminPostStatus,
  type BlogPost,
  type BlogStatus,
} from "@/features/admin/api";

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-ink-100 text-ink-600",
  SCHEDULED: "bg-blue-100 text-blue-700",
  PUBLISHED: "bg-green-100 text-green-700",
  ARCHIVED: "bg-ink-100 text-ink-400",
};

export default function AdminBlogPage() {
  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const qc = useQueryClient();

  const posts = useQuery({
    queryKey: ["admin", "blog", status, search, page],
    queryFn: () => listAdminPosts({ status: status || undefined, search: search || undefined, page }),
    staleTime: 15_000,
  });

  const setStatusMut = useMutation({
    mutationFn: ({ id, s }: { id: string; s: BlogStatus }) => setAdminPostStatus(id, s),
    onSuccess: (_d, { s }) => {
      toast.success(s === "PUBLISHED" ? "Post published" : s === "ARCHIVED" ? "Post archived" : `Status: ${s}`);
    },
    onError: () => toast.error("Could not update post status"),
    onSettled: () => qc.invalidateQueries({ queryKey: ["admin", "blog"] }),
  });

  const data = posts.data?.data ?? [];
  const meta = posts.data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-extrabold">Blog CMS</h1>
          <p className="text-ink-500 text-sm mt-1">
            Create, edit and publish SEO content (subject/exam-tagged).
          </p>
        </div>
        <Button variant="gold" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? "Close" : "+ New post"}
        </Button>
      </div>

      {showCreate && (
        <CreatePostForm
          onDone={() => {
            setShowCreate(false);
            qc.invalidateQueries({ queryKey: ["admin", "blog"] });
          }}
        />
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        {["", "DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"].map((s) => (
          <button
            key={s || "all"}
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
              status === s ? "bg-deep text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"
            }`}
          >
            {s || "All"}
          </button>
        ))}
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search title or slug…"
          className="ml-auto rounded-xl border border-ink-200 px-4 py-2 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary focus:outline-none"
        />
      </div>

      {/* Table */}
      {posts.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : data.length === 0 ? (
        <div className="border rounded-2xl p-12 text-center text-ink-500">
          No posts yet - publish your first study guide.
        </div>
      ) : (
        <div className="border rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-ink-50 text-left text-xs text-ink-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Title</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Slug</th>
                <th className="px-5 py-3 font-semibold">Updated</th>
                <th className="px-5 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p: BlogPost) => (
                <tr key={p.id} className="border-t border-ink-100 hover:bg-ink-50/50">
                  <td className="px-5 py-3 font-semibold max-w-[280px] truncate">{p.title}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_BADGE[p.status]}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-ink-500">{p.slug}</td>
                  <td className="px-5 py-3 text-xs text-ink-500">
                    {new Date(p.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {p.status === "DRAFT" && (
                      <Button size="sm" disabled={setStatusMut.isPending}
                        onClick={() => setStatusMut.mutate({ id: p.id, s: "PUBLISHED" })}>
                        Publish
                      </Button>
                    )}
                    {p.status === "PUBLISHED" && (
                      <Button size="sm" variant="outline" disabled={setStatusMut.isPending}
                        onClick={() => setStatusMut.mutate({ id: p.id, s: "ARCHIVED" })}>
                        Archive
                      </Button>
                    )}
                    {p.status === "SCHEDULED" && (
                      <Button size="sm" variant="outline" disabled={setStatusMut.isPending}
                        onClick={() => setStatusMut.mutate({ id: p.id, s: "DRAFT" })}>
                        Unschedule
                      </Button>
                    )}
                    {p.status === "ARCHIVED" && (
                      <Button size="sm" variant="outline" disabled={setStatusMut.isPending}
                        onClick={() => setStatusMut.mutate({ id: p.id, s: "DRAFT" })}>
                        Restore
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {meta && meta.total_pages > 1 && (
        <div className="flex justify-center gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Prev
          </Button>
          <span className="text-sm text-ink-500 self-center">
            Page {meta.page} / {meta.total_pages}
          </span>
          <Button size="sm" variant="outline" disabled={!meta.has_next} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

function CreatePostForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    status: "DRAFT" as BlogStatus,
    seo_title: "",
    seo_description: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await createAdminPost({
        title: form.title,
        slug: form.slug || undefined,
        excerpt: form.excerpt || undefined,
        content: form.content,
        status: form.status,
        seo_title: form.seo_title || undefined,
        seo_description: form.seo_description || undefined,
      });
      onDone();
      toast.success("Post created");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create post");
    } finally {
      setBusy(false);
    }
  };

  const field = (key: keyof typeof form, label: string, rows?: number) => (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      {rows ? (
        <textarea
          rows={rows}
          className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary focus:outline-none"
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        />
      ) : (
        <input
          className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary focus:outline-none"
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        />
      )}
    </label>
  );

  return (
    <div className="border rounded-2xl p-6 space-y-4 bg-white">
      <h2 className="font-bold">New blog post</h2>
      <div className="grid md:grid-cols-2 gap-4">
        {field("title", "Title *")}
        {field("slug", "Slug (optional - auto-generated)")}
      </div>
      {field("excerpt", "Excerpt (SEO meta description source)")}
      {field("content", "Content *", 8)}
      <div className="grid md:grid-cols-2 gap-4">
        {field("seo_title", "SEO title")}
        {field("seo_description", "SEO description")}
      </div>
      <label className="block text-sm">
        <span className="font-medium">Status</span>
        <select
          className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm"
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value as BlogStatus })}
        >
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Publish now</option>
          <option value="SCHEDULED">Scheduled</option>
        </select>
      </label>
      {error ? (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}
      <div className="flex gap-3">
        <Button variant="gold" disabled={busy || !form.title.trim() || !form.content.trim()} onClick={() => void submit()}>
          {busy ? "Creating…" : "Create post"}
        </Button>
        <Button variant="outline" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
