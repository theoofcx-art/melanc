import { describe, it, expect } from "vitest";
import { availableFrames, FRAMES } from "./frames";

describe("frames", () => {
  it("free frames are available to everyone and Christmas is gone", () => {
    expect(availableFrames([])).toEqual(["melancia", "estrelas", "luz", "galaxia", "katseye", "ciano"]);
    expect("natal" in FRAMES).toBe(false);
  });
  it("the rainbow frame is only available once earned", () => {
    expect(availableFrames(["nyan"])).toContain("nyan");
  });
  it("follower frames unlock at 10..90 followers", () => {
    for (const [k, n] of [["nuvem", 10], ["neon", 20], ["cereja", 30], ["laco", 40], ["ursinho", 50], ["estrela_azul", 60], ["rosa", 70], ["folhas", 80], ["melodia", 90]] as const) {
      expect(availableFrames([], n - 1)).not.toContain(k);
      expect(availableFrames([], n)).toContain(k);
    }
  });
  it("view frames need one post with 60 or 150 views", () => {
    expect(availableFrames([], 0, false, 59)).not.toContain("patinho");
    expect(availableFrames([], 0, false, 60)).toContain("patinho");
    expect(availableFrames([], 0, false, 149)).not.toContain("boia");
    expect(availableFrames([], 0, false, 150)).toContain("boia");
  });
});
