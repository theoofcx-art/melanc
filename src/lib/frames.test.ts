import { describe, it, expect } from "vitest";
import { availableFrames } from "./frames";

describe("frames", () => {
  it("Christmas and watermelon frames are free for everyone", () => {
    expect(availableFrames([])).toEqual(["natal", "melancia"]);
  });
  it("the rainbow frame is only available once earned", () => {
    expect(availableFrames(["nyan"])).toContain("nyan");
  });
  it("the cloud frame unlocks at 10 followers", () => {
    expect(availableFrames([], 9)).not.toContain("nuvem");
    expect(availableFrames([], 10)).toContain("nuvem");
  });
});
