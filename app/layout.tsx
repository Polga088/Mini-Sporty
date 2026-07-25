import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: {
    default: "Friday Match Wallet",
    template: "%s · Friday Match Wallet"
  },
  description: "Gestion interne du match de football du vendredi",
  manifest: "/manifest.webmanifest",
  applicationName: "Friday Match Wallet",
  appleWebApp: {
    capable: true,
    title: "Friday Match Wallet",
    statusBarStyle: "default"
  },
  icons: [
    { rel: "icon", url: "/icon-192.svg" },
    { rel: "apple-touch-icon", url: "/icon-192.svg" }
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
