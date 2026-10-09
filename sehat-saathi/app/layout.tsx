import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sehat Saathi | Your personal health copilot",
  description: "Understand your medical records, review AI-extracted results, and keep your health journey together. English and Hindi health record companion.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
