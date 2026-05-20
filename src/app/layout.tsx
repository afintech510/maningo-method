import type { Metadata, Viewport } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import "./globals.css";
import { getAuth } from "@/lib/auth";
import { MobileNav } from "@/components/layout/MobileNav";
import { LocalBusinessSchema } from "@/components/seo/LocalBusinessSchema";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Maningo Method | Pilates Studio in Speonk, NY",
  description:
    "Mat & Sculpt Pilates classes in Speonk, NY — serving Westhampton, East Quogue, and the surrounding Hamptons area. Small classes, max 20 students, all levels welcome. Book online.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || "https://www.maningomethod.com"
  ),
  openGraph: {
    title: "Maningo Method | Pilates Studio in Speonk, NY",
    description:
      "Mat & Sculpt Pilates classes in Speonk, NY — serving Westhampton, East Quogue, and the surrounding Hamptons area. Book your spot online.",
    url: "https://www.maningomethod.com",
    siteName: "Maningo Method",
    type: "website",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const auth = await getAuth();
  const isLoggedIn = !!auth;

  return (
    <html lang="en">
      <head>
        <LocalBusinessSchema />
      </head>
      <body
        className={`${playfair.variable} ${dmSans.variable} font-sans antialiased bg-background text-foreground ${
          isLoggedIn ? 'pb-16 lg:pb-0' : ''
        }`}
      >
        {children}
        {isLoggedIn && <MobileNav />}
      </body>
    </html>
  );
}
