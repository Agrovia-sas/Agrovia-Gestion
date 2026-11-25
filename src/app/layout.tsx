import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AGROVIA — Gestión",
  description: "Sistema de gestión comercial y financiera de AGROVIA SAS",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#1f4d3a",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR">
      <head>
        <link rel="preconnect" href="https://rsms.me/" />
        <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
