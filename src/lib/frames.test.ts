import { describe, it, expect } from "vitest";
import { availableFrames } from "./frames";

describe("frames", () => {
  it("the Christmas frame is free for everyone", () => {
    expect(availableFrames([])).toEqual(["natal"]);
  });
  it("the rainbow frame is only available once earned", () => {
    expect(availableFrames(["nyan"])).toContain("nyan");
  });
});
