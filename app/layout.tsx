import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pizarra Virtual",
  description: "Dibujá con quien quieras. Se borra cada 5 minutos.",
  applicationName: "Pizarra",
  appleWebApp: {
    capable: true,
    title: "Pizarra",
    statusBarStyle: "black-translucent",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0f1115",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full">
      <body className="h-full bg-bg text-white antialiased overflow-hidden">
        {children}
      </body>
    </html>
  );
}