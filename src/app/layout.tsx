import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rialo Arena",
  description:
    "The competitive Rialo knowledge challenge: 15 questions, 20 seconds each, and up to 3,000 points.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
