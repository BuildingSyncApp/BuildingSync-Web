import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono, Bebas_Neue } from "next/font/google";
import { RegisterServiceWorker } from "@/components/RegisterServiceWorker";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import { BetaBanner } from "@/components/BetaBanner";
import { ToastProvider } from "@/components/ToastProvider";
import { MotionConfigProvider } from "@/components/MotionConfig";
import { CookieBanner } from "@/components/CookieBanner";
import { Analytics } from "@/components/Analytics";
import { getLocale } from "@/lib/locale-server";
import { localeMeta } from "@/lib/locale";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});
const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});
const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BuildingSync",
  description: "Property management for residents, tenants, and building staff.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "BuildingSync" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#efeae0" },
    { media: "(prefers-color-scheme: dark)", color: "#141414" },
  ],
};

// Inline pre-paint script — sets the saved theme attribute before React mounts
// so authed pages don't flash the wrong palette on every navigation.
const themeBootstrap = `
(function() {
  try {
    var t = localStorage.getItem('bs-theme') || 'paper';
    var html = document.documentElement;
    html.classList.remove('dark');
    html.removeAttribute('data-theme');
    if (t === 'dark') html.setAttribute('data-theme', 'dark');
    else if (t === 'paper') html.setAttribute('data-theme', 'paper');
  } catch (e) {}
})();
`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const meta = localeMeta(locale);
  return (
    <html lang={locale} dir={meta.dir} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body
        className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} ${bebasNeue.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <MotionConfigProvider>
          <BetaBanner />
          {children}
        </MotionConfigProvider>
        <ToastProvider />
        <RegisterServiceWorker />
        <PwaInstallPrompt />
        <CookieBanner />
        <Analytics />
      </body>
    </html>
  );
}
