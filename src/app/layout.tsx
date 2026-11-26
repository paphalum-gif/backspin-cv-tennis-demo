import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Backspin",
  description: "Backspin tennis tournament registration",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
