import "./globals.css";
export const metadata = {
  title: "Midnight Magic — Make a birthday unforgettable",
  description:
    "A cinematic birthday website builder. Twelve chapters, one unforgettable gift.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
