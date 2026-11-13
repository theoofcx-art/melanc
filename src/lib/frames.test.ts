import { describe, it, expect } from "vitest";
import { availableFrames } from "./frames";

describe("frames", () => {
  it("Christmas and watermelon frames are free for everyone", () => {
    expect(availableFrames([])).toEqual(["natal", "melancia", "estrelas"]);
  });
  it("the rainbow frame is only available once earned", () => {
    expect(availableFrames(["nyan"])).toContain("nyan");
  });
  it("the cloud frame unlocks at 10 followers", () => {
    expect(availableFrames([], 9)).not.toContain("nuvem");
    expect(availableFrames([], 10)).toContain("nuvem");
  });
  it("follower frames unlock at 20, 30, 40, 50 and 60 followers", () => {
    for (const [k, n] of [["neon", 20], ["cereja", 30], ["laco", 40], ["ursinho", 50], ["estrela_azul", 60]] as const) {
      expect(availableFrames([], n - 1)).not.toContain(k);
      expect(availableFrames([], n)).toContain(k);
    }
  });
});
