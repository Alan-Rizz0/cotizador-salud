import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cotiza Salud | Compará tu cobertura",
  description: "Cotizador orientativo de planes de salud. Compará alternativas y obtené un valor estimativo.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
