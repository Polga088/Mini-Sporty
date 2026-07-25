import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: {
    default: "Mini Sporty",
    template: "%s · Mini Sporty"
  },
  description: "Gestion du match du vendredi, portefeuille et sondages",
  manifest: "/manifest.webmanifest",
  applicationName: "Mini Sporty",
  appleWebApp: {
    capable: true,
    title: "Mini Sporty",
    statusBarStyle: "default"
  },
  icons: [
    { rel: "icon", url: "/icon-192.svg" },
    { rel: "apple-touch-icon", url: "/icon-192.svg" },
    { rel: "icon", url: "/icon-maskable.svg" }
  ]
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
