import { describe, expect, it } from "vitest";
import { cleanPollOptions, pollPercents } from "./poll";

describe("polls", () => {
  it("keeps at most 6 non-empty, unique options", () => {
    expect(cleanPollOptions(["a", " ", "A", "b", "c", "d", "e", "f", "g"])).toEqual(["a", "b", "c", "d", "e", "f"]);
  });
  it("computes percent from voters", () => {
    expect(pollPercents([3, 1], 4)).toEqual([75, 25]);
    expect(pollPercents([0, 0], 0)).toEqual([0, 0]);
  });
});
