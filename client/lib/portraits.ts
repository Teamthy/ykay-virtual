const PORTRAITS = ["chinasa", "olanike", "oluwatobi", "adewale", "judith", "demilola"] as const;

export function tutorPortraitSrc(slug: string, avatarUrl?: string | null): string {
  if (avatarUrl) return avatarUrl;
  if ((PORTRAITS as readonly string[]).includes(slug)) return `/tutors/${slug}.jpg`;
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h + slug.charCodeAt(i)) % PORTRAITS.length;
  return `/tutors/${PORTRAITS[h]}.jpg`;
}
