import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mini Sporty",
    short_name: "Sporty",
    description: "Gestion du match du vendredi, du portefeuille et des sondages.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    lang: "fr",
    background_color: "#f8fafc",
    theme_color: "#0f766e",
    icons: [
      {
        src: "/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any"
      },
      {
        src: "/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any"
      },
      {
        src: "/icon-maskable.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable"
      }
    ]
  };
}
