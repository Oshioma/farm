import "./globals.css";
import type { Metadata, Viewport } from "next";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { LanguageProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Shamba Online",
  description: "Shamba farm task manager and crop tracker",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#166534",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          {children}
          <OfflineIndicator />
        </LanguageProvider>
      </body>
    </html>
  );
}
