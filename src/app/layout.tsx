import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import RoleBanner from "./_components/RoleBanner";
import { ToastContainer } from "./_components/ToastContainer";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import ServiceWorkerRegistration from "./_components/ServiceWorkerRegistration";
import OfflineBanner from "./_components/OfflineBanner";
import "./globals.css";
import "./ticket.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#1e40af",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "PIC PHOTO - POS",
  description: "Sistema de Punto de Venta para Laboratorio Fotográfico",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-512.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PIC PHOTO",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <OfflineBanner />
        <RoleBanner />
        <ThemeProvider>
          <ToastContainer>{children}</ToastContainer>
        </ThemeProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
