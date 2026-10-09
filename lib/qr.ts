import QRCode from "qrcode";
export function snapshotURL(origin: string, slug: string): string {
  const base = new URL(origin);
  if (
    !["http:", "https:"].includes(base.protocol) ||
    !/^[a-zA-Z0-9-]{1,64}$/.test(slug)
  )
    throw new Error("Invalid snapshot URL.");
  return new URL(`/s/${slug}`, base).href;
}
export async function generateQR(url: string): Promise<string> {
  const value = new URL(url);
  if (!["http:", "https:"].includes(value.protocol))
    throw new Error("QR codes require a website URL.");
  return QRCode.toDataURL(value.href, {
    width: 600,
    margin: 4,
    errorCorrectionLevel: "M",
    color: { dark: "#181126", light: "#ffffff" },
  });
}
