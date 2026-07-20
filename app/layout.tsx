import "./globals.css";
import type { Metadata, Viewport } from "next";
import { OfflineIndicator } from "@/components/OfflineIndicator";

export const metadata: Metadata = {
  title: "Shamba Online",
  description: "Shamba farm task manager and crop tracker",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <OfflineIndicator />
      </body>
    </html>
  );
}
