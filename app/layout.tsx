import "./globals.css";
export const metadata = {
  title: "Birthday Universe Studio — Birthday Website Builder",
  description:
    "Choose one of five birthday experiences and create a personal website with memories, music, letters and surprises.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
