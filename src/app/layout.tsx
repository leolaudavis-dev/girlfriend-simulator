import type { Metadata } from "next";
import "./globals.css";
import { Shell } from "./_components/Shell";

export const metadata: Metadata = {
  title: "Home",
  description: "Art projects.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
