import type { MetadataRoute } from "next";

// Permite instalar el sistema como aplicación; siempre abre en el Panel general.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AGROVIA — Gestión",
    short_name: "AGROVIA",
    description: "Sistema de gestión de AGROVIA SAS",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f5f6f4",
    theme_color: "#1f4d3a",
    lang: "es-AR",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    ],
  };
}
