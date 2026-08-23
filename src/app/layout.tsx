import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Front of Pack — Understand any product label",
  description:
    "Upload a product photo and get a clear, evidence-led explanation in your language.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
