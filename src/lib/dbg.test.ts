// Placeholder kept around because the workspace mount can't remove files.
// Holding a single passing assertion keeps vitest from reporting "no test
// suite found in file". Safe to delete this file on a normal filesystem.
import { describe, it, expect } from "vitest";

describe("dbg placeholder", () => {
  it("is a no-op", () => {
    expect(true).toBe(true);
  });
});
