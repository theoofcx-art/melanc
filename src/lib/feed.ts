export const BOOST_PRICE_PER_DAY = 3;
export const BOOST_WHATSAPP = "5519996591186";
/** A boosted post is repeated in the feed every N slots. */
export const BOOST_REPEAT_EVERY = 5;

/** Verified accounts get extra reach in the feed. */
export const VERIFIED_BONUS = 4;

export type Signals = {
  followed: Set<string>;
  likedAuthors: Map<string, number>;
  likedTags: Map<string, number>;
  interests: Set<string>;
};

type P = { id: string; author_id: string; author?: { is_verified?: boolean } | null; hashtags: string[]; created_at: string; boosted_until?: string | null; likes: unknown[] };

export function isBoosted(p: { boosted_until?: string | null }, now = Date.now()) {
  return !!p.boosted_until && new Date(p.boosted_until).getTime() > now;
}

/** Learned score: who you follow, whose posts you like, which tags you like, recency, popularity. */
export function scorePost(p: P, s: Signals, now = Date.now()) {
  let score = 0;
  if (s.followed.has(p.author_id)) score += 6;
  score += Math.min(s.likedAuthors.get(p.author_id) ?? 0, 5) * 1.5;
  for (const t of p.hashtags) {
    const tag = t.toLowerCase();
    score += Math.min(s.likedTags.get(tag) ?? 0, 5);
    if (s.interests.has(tag)) score += 2;
  }
  if (p.author?.is_verified) score += VERIFIED_BONUS;
  score += Math.log2(1 + p.likes.length);
  const hours = (now - new Date(p.created_at).getTime()) / 36e5;
  score -= hours / 12;
  return score;
}

export function rankFeed<T extends P>(posts: T[], s: Signals, now = Date.now()): T[] {
  const ranked = [...posts].sort((a, b) => scorePost(b, s, now) - scorePost(a, s, now));
  const boosted = posts.filter((p) => isBoosted(p, now));
  if (!boosted.length) return ranked;
  const out: T[] = [];
  let b = 0;
  ranked.forEach((p, i) => {
    if (i % BOOST_REPEAT_EVERY === 0) out.push(boosted[b++ % boosted.length]);
    out.push(p);
  });
  return out;
}

export function boostWhatsAppUrl(postId: string, days = 1) {
  const msg = `Olá! Quero turbmels a minha publicação no Melan (ID ${postId}) por ${days} dia(s) — R$ ${days * BOOST_PRICE_PER_DAY},00.`;
  return `https://wa.me/${BOOST_WHATSAPP}?text=${encodeURIComponent(msg)}`;
}

export const FILTERS: Record<string, { label: string; css: string }> = {
  none: { label: "Normal", css: "none" },
  melan: { label: "Melan", css: "saturate(1.3) hue-rotate(-8deg) contrast(1.05)" },
  noite: { label: "Noite", css: "brightness(0.85) contrast(1.2) saturate(0.8)" },
  pb: { label: "P&B", css: "grayscale(1) contrast(1.1)" },
  vintage: { label: "Vintage", css: "sepia(0.5) contrast(0.95) brightness(1.05)" },
  quente: { label: "Quente", css: "saturate(1.4) sepia(0.2) brightness(1.05)" },
  frio: { label: "Frio", css: "hue-rotate(20deg) saturate(1.1) brightness(1.02)" },
};
