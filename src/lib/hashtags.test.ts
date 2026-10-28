import { describe, it, expect } from "vitest";
import { extractHashtags, rankByInterests, spotifyEmbedUrl } from "./hashtags";

describe("hashtags", () => {
  it("extracts lowercase unique hashtags", () => {
    expect(extractHashtags("Oi #Kpop e #kpop #música")).toEqual(["kpop", "música"]);
  });
  it("ranks posts matching interests first", () => {
    const posts = [
      { id: 1, hashtags: [], created_at: "2026-10-02" },
      { id: 2, hashtags: ["kpop"], created_at: "2026-10-01" },
    ];
    expect(rankByInterests(posts, ["kpop"]).map((p) => p.id)).toEqual([2, 1]);
  });
  it("builds spotify embed url", () => {
    expect(spotifyEmbedUrl("https://open.spotify.com/track/abc123?si=x")).toBe(
      "https://open.spotify.com/embed/track/abc123?utm_source=generator&theme=0",
    );
  });
});
