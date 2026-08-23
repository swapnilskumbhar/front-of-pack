import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Front of Pack — Understand product labels from one photo",
  description:
    "Upload one product photo and get a clear, sourced explanation in your language.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
