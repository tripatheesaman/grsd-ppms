import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { Plus_Jakarta_Sans, Source_Sans_3 } from "next/font/google";
import { AppProviders } from "@/components/providers/app-providers";
import { APP_DESCRIPTION, APP_ICON_PATH, APP_SHORT_NAME } from "@/lib/brand";
import { withBasePath } from "@/lib/config/app-config";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: APP_SHORT_NAME,
    template: `%s · ${APP_SHORT_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_SHORT_NAME,
  icons: {
    icon: [{ url: withBasePath(APP_ICON_PATH), type: "image/png" }],
    shortcut: withBasePath(APP_ICON_PATH),
    apple: withBasePath(APP_ICON_PATH),
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${plusJakarta.variable} ${sourceSans.variable} ${geistMono.variable} antialiased`}
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
