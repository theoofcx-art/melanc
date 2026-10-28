export function extractHashtags(text: string): string[] {
  const set = new Set<string>();
  for (const m of text.matchAll(/#([\p{L}\p{N}_]{1,40})/gu)) set.add(m[1].toLowerCase());
  return [...set].slice(0, 20);
}

/** Rank posts: those sharing the user's interest hashtags first, then by recency. */
export function rankByInterests<T extends { hashtags: string[]; created_at: string }>(
  posts: T[],
  interests: string[],
): T[] {
  const set = new Set(interests.map((i) => i.toLowerCase()));
  const score = (p: T) => p.hashtags.filter((h) => set.has(h.toLowerCase())).length;
  return [...posts].sort((a, b) => {
    const d = score(b) - score(a);
    if (d !== 0) return d;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export function spotifyEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|album|playlist|episode|artist)\/([A-Za-z0-9]+)/);
  if (!m) return null;
  return `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator&theme=0`;
}
