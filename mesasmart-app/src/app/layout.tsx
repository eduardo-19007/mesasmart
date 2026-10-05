import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MesaSmart",
  description: "Autogestión de pedidos para restaurantes con atención en mesa",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
