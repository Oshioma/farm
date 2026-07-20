import type { MetadataRoute } from "next";

// Web app manifest — lets Shamba Online be installed to a phone home screen
// with the SO icon and its own standalone window. Next.js serves this at
// /manifest.webmanifest and links it automatically.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Shamba Online",
    short_name: "Shamba",
    description: "Shamba farm task manager and crop tracker",
    start_url: "/",
    display: "standalone",
    background_color: "#052e16",
    theme_color: "#166534",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
