import { test, expect } from "@playwright/test";
test("demo: create, edit, save, reload, snapshot isolation, unpublish, duplicate, delete", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(page.getByText("BROWSER DEMO", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Create a birthday website", exact: true })
    .click();
  await page
    .getByLabel("Website title", { exact: true })
    .fill("Test celebration");
  await page
    .getByLabel("Recipient name", { exact: true })
    .fill("Sample recipient");
  await page
    .getByLabel("Your words", { exact: true })
    .fill("Snapshot original text");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Saved");
  await page
    .getByRole("button", { name: "Create demo snapshot", exact: true })
    .click();
  const href = await page.locator(".share > a").getAttribute("href");
  expect(href).toBeTruthy();
  await expect(
    page.getByRole("link", { name: "Download QR code", exact: true }),
  ).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Download QR code", exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/-qr\.png$/);
  await page
    .getByLabel("Your words", { exact: true })
    .fill("Unpublished draft edit");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  const published = await context.newPage();
  await published.goto(href!);
  await expect(
    published.getByText("Snapshot original text", { exact: true }),
  ).toBeVisible();
  await expect(
    published.getByText("Unpublished draft edit", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Move Welcome and opening reveal down" })
    .click();
  await expect(page.locator(".chapter-row").first()).toContainText(
    "Birthday countdown",
  );
  await page
    .getByRole("button", { name: "Hide this chapter", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Show this chapter", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Open editor" }).click();
  await expect(page.getByLabel("Recipient name", { exact: true })).toHaveValue(
    "Sample recipient",
  );
  await expect(page.locator(".chapter-row").first()).toContainText(
    "Birthday countdown",
  );
  await page
    .getByRole("button", { name: "Create demo snapshot", exact: true })
    .click();
  await page.getByRole("button", { name: "Unpublish", exact: true }).click();
  await published.reload();
  await expect(
    published.getByText(/Local demo snapshot not found/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  await page
    .getByRole("button", { name: "Duplicate Test celebration", exact: true })
    .click();
  await expect(page.locator(".site-card")).toHaveCount(2);
  await page
    .getByRole("button", {
      name: "Delete Test celebration (copy)",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Delete story", exact: true }).click();
  await expect(page.locator(".site-card")).toHaveCount(1);
});
test("media persists across reload and crop edits; mobile has no overflow", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Create a birthday website", exact: true })
    .click();
  await page.getByRole("button", { name: "Media", exact: true }).click();
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles({
      name: "memory.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==",
        "base64",
      ),
    });
  await expect(page.getByLabel("Caption / image description")).toBeVisible();
  await page.getByLabel("Caption / image description").fill("A sample memory");
  await page.getByLabel("Crop zoom").fill("1.5");
  await page
    .getByLabel("Replace this memory")
    .setInputFiles({
      name: "replacement.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==",
        "base64",
      ),
    });
  await expect(page.locator(".media-edit")).toHaveCount(1);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Saved");
  await page.reload();
  await page.getByRole("button", { name: "Open editor" }).click();
  await page.getByRole("button", { name: "Media", exact: true }).click();
  await expect(page.getByLabel("Caption / image description")).toHaveValue(
    "A sample memory",
  );
  await expect(page.getByLabel("Crop zoom")).toHaveValue("1.5");
  await expect(page.locator(".media-edit img")).toHaveJSProperty(
    "complete",
    true,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});
test("twelve chapters, countdown, surprise, theme, music and uploaded video playback", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Create a birthday website", exact: true })
    .click();
  for (let i = 0; i < 12; i++) {
    await page.locator(".chapter-row>button").nth(i).click();
    await page
      .getByLabel("Your words", { exact: true })
      .fill(`Memory chapter ${i + 1}`);
  }
  await page
    .getByLabel("Birthday date and time", { exact: true })
    .fill("2099-01-01T00:00");
  await page.getByRole("button", { name: "Style", exact: true }).click();
  await page.getByLabel("Typography").selectOption("sans");
  await page
    .getByRole("button", { name: "Choose #ffb9ca", exact: true })
    .click();
  await page.getByRole("button", { name: "Media", exact: true }).click();
  // Generate valid local media, rather than claiming playback from an invalid file fixture.
  const webm = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#cab5ff";
    ctx.fillRect(0, 0, 64, 64);
    const stream = canvas.captureStream(10);
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    const chunks: Blob[] = [];
    const done = new Promise<Blob>((resolve) => {
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
    });
    recorder.start();
    await new Promise((resolve) => setTimeout(resolve, 600));
    recorder.stop();
    const bytes = new Uint8Array(await (await done).arrayBuffer());
    stream.getTracks().forEach((track) => track.stop());
    return Array.from(bytes);
  });
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles({
      name: "memory.webm",
      mimeType: "video/webm",
      buffer: Buffer.from(webm),
    });
  await expect(page.locator(".media-edit")).toHaveCount(1);
  const wav = Buffer.alloc(44 + 16000);
  wav.write("RIFF");
  wav.writeUInt32LE(36 + 16000, 4);
  wav.write("WAVE", 8);
  wav.write("fmt ", 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8000, 24);
  wav.writeUInt32LE(16000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(16000, 40);
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles({ name: "music.wav", mimeType: "audio/wav", buffer: wav });
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.locator(".experience:not(.compact) .chapter")).toHaveCount(
    12,
  );
  await expect(page.locator(".countdown")).toContainText("days");
  await page
    .getByRole("button", { name: "Open your surprise ✦", exact: true })
    .click();
  await expect(
    page.getByText("Memory chapter 11", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".experience")).toHaveCSS(
    "font-family",
    "Arial, sans-serif",
  );
  await expect(page.locator("audio")).toHaveJSProperty("autoplay", false);
  await expect(page.locator("audio")).toHaveJSProperty("controls", true);
  await expect(page.locator("video")).toHaveJSProperty("controls", true);
  await page.locator("video").evaluate(async (video: HTMLVideoElement) => {
    video.muted = true;
    video.loop = true;
    await video.play();
  });
  await expect(page.locator("video")).toHaveJSProperty("paused", false);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".chapter").first()).toHaveCSS(
    "animation-name",
    "none",
  );
  await page
    .getByRole("button", { name: "Mobile preview", exact: true })
    .click();
  await expect(
    page
      .frameLocator('iframe[title="Mobile birthday preview"]')
      .locator(".chapter"),
  ).toHaveCount(12);
  await expect(page.locator(".mobile-preview iframe")).toHaveCSS(
    "width",
    "390px",
  );
});
