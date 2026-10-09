import { test } from "node:test";
import assert from "node:assert/strict";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import { snapshotURL, generateQR } from "../lib/qr";
test("downloadable PNG QR decodes to the exact snapshot URL", async () => {
  const url = snapshotURL("https://birthday.example", "abc-123");
  const image = await generateQR(url);
  const png = PNG.sync.read(Buffer.from(image.split(",")[1], "base64"));
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  assert.equal(decoded?.data, url);
});
test("QR and link helpers reject executable URLs and invalid slugs", async () => {
  assert.throws(() => snapshotURL("javascript:alert(1)", "abc"));
  assert.throws(() => snapshotURL("https://birthday.example", "../private"));
  await assert.rejects(() => generateQR("javascript:alert(1)"));
});
