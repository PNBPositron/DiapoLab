import { describe, expect, test } from "bun:test";
import { newText, newShape } from "@/store/editor";
import { matchMorphElements } from "./morph";

describe("morph matching", () => {
  test("preserves identity when text changes and elements reorder", () => {
    const a = newText({ id: "a", text: "Old title", x: 20 });
    const b = newText({ id: "b", text: "Other", x: 300 });
    const matches = matchMorphElements([a, b], [{ ...b, x: 500 }, { ...a, text: "New title", x: 200 }]);
    expect(matches.get("a")?.x).toBe(20);
    expect(matches.get("b")?.x).toBe(300);
  });
  test("matches duplicated slides with new IDs one-to-one", () => {
    const a = newShape({ id: "a", x: 40 });
    const b = newShape({ id: "b", x: 80 });
    const matches = matchMorphElements([a, b], [{ ...a, id: "c" }, { ...b, id: "d" }]);
    expect(matches.get("c")?.x).toBe(40);
    expect(matches.get("d")?.x).toBe(80);
  });
  test("does not consume an exact content match for an edited title", () => {
    const a = newText({ text: "Title", x: 10 });
    const b = newText({ text: "Unchanged", x: 50 });
    const matches = matchMorphElements([a, b], [{ ...a, id: "new", text: "Edited" }, { ...b, id: "same" }]);
    expect(matches.get("same")?.x).toBe(50);
    expect(matches.get("new")?.x).toBe(10);
  });
  test("new unmatched element fades in rather than matching another type", () => {
    expect(matchMorphElements([newText()], [newShape({ id: "new" })]).has("new")).toBe(false);
  });
});