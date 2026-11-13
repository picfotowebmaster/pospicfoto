import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import RoleBanner from "./_components/RoleBanner";
import { ToastContainer } from "./_components/ToastContainer";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import { NOMBRE_EMPRESA } from "@/lib/utils/constantes";
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
  title: `${NOMBRE_EMPRESA} - POS`,
  description: "Sistema de Punto de Venta para Laboratorio Fotográfico",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-512.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: NOMBRE_EMPRESA,
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
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t!=="dark"&&t!=="light"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.classList.toggle("dark",t==="dark")}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
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
