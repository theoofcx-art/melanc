import { describe, it, expect } from "vitest";
import { rankFeed, boostWhatsAppUrl, BOOST_PRICE_PER_DAY } from "./feed";

const now = new Date("2026-10-31T12:00:00Z").getTime();
const base = { hashtags: [] as string[], created_at: "2026-10-31T10:00:00Z", likes: [] as unknown[], boosted_until: null as string | null };
const empty = { followed: new Set<string>(), likedAuthors: new Map(), likedTags: new Map(), interests: new Set<string>() };

describe("feed", () => {
  it("ranks posts from followed authors first", () => {
    const posts = [{ ...base, id: "a", author_id: "x" }, { ...base, id: "b", author_id: "f" }];
    expect(rankFeed(posts, { ...empty, followed: new Set(["f"]) }, now).map((p) => p.id)).toEqual(["b", "a"]);
  });
  it("learns from tags of liked posts", () => {
    const posts = [{ ...base, id: "a", author_id: "x" }, { ...base, id: "b", author_id: "y", hashtags: ["kpop"] }];
    expect(rankFeed(posts, { ...empty, likedTags: new Map([["kpop", 2]]) }, now)[0].id).toBe("b");
  });
  it("repeats boosted posts in the feed", () => {
    const posts = Array.from({ length: 10 }, (_, i) => ({ ...base, id: String(i), author_id: "x" }));
    posts[9].boosted_until = "2026-11-01T00:00:00Z";
    expect(rankFeed(posts, empty, now).filter((p) => p.id === "9").length).toBeGreaterThan(1);
  });
  it("boost costs 3 reais per day and goes to the WhatsApp number", () => {
    expect(BOOST_PRICE_PER_DAY).toBe(3);
    const url = boostWhatsAppUrl("p1", 2);
    expect(url.startsWith("https://wa.me/5519996591186")).toBe(true);
    expect(decodeURIComponent(url)).toContain("R$ 6,00");
  });
  it("gives verified accounts more visibility", () => {
    const posts = [{ ...base, id: "a", author_id: "x" }, { ...base, id: "v", author_id: "y", author: { is_verified: true } }];
    expect(rankFeed(posts, empty, now)[0].id).toBe("v");
  });
  it("shows unseen posts before seen ones, keeping seen ones in the feed", () => {
    const posts = [{ ...base, id: "a", author_id: "f" }, { ...base, id: "b", author_id: "x" }];
    const out = rankFeed(posts, { ...empty, followed: new Set(["f"]), seen: new Set(["a"]) }, now).map((p) => p.id);
    expect(out).toEqual(["b", "a"]);
  });
  it("posts reposted by people you follow rank higher", () => {
    const posts = [{ ...base, id: "a", author_id: "x" }, { ...base, id: "b", author_id: "y" }];
    expect(rankFeed(posts, { ...empty, repostedByFollowed: new Map([["b", 1]]) }, now)[0].id).toBe("b");
  });
});
