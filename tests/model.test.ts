import { test } from "node:test";
import assert from "node:assert/strict";
import {
  newSite,
  moveChapter,
  validateFile,
  videoEmbed,
  isEmbed,
  safeMediaURL,
} from "../lib/model";
test("new stories have twelve independent neutral chapters", () => {
  const a = newSite(),
    b = newSite();
  assert.equal(a.chapters.length, 12);
  assert.notEqual(a.id, b.id);
  assert.equal(a.recipient, "");
  a.chapters[0].text = "Private";
  assert.equal(b.chapters[0].text, "");
});
test("reorder preserves identity and boundaries", () => {
  const a = newSite();
  assert.equal(moveChapter(a, "0", -1), a);
  const b = moveChapter(a, "0", 1);
  assert.equal(b.chapters[1].id, "0");
  assert.equal(a.chapters[0].id, "0");
  assert.equal(b.chapters.length, 12);
});
test("media rejects active content and oversized files", () => {
  assert.throws(() => validateFile({ size: 10, type: "image/svg+xml" }));
  assert.throws(() =>
    validateFile({ size: 11 * 1024 * 1024, type: "image/png" }),
  );
  assert.equal(validateFile({ size: 100, type: "video/mp4" }), "video");
});
test("embed whitelist excludes executable and unrelated URLs", () => {
  assert.equal(isEmbed("https://evil.example/embed/abcdefghijk"), false);
  assert.equal(safeMediaURL("javascript:alert(1)"), "");
  assert.equal(videoEmbed("javascript:alert(1)"), null);
  assert.equal(videoEmbed("https://evil.example/video"), null);
  assert.equal(
    videoEmbed("https://youtu.be/abcdefghijk"),
    "https://www.youtube-nocookie.com/embed/abcdefghijk",
  );
  assert.equal(
    videoEmbed("https://vimeo.com/123456"),
    "https://player.vimeo.com/video/123456",
  );
});
