import type { Metadata } from "next";
import { Inter, DM_Serif_Display } from "next/font/google";
import "./globals.css";
import { PwaProvider } from "@/components/providers/PwaProvider";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const dmSerif = DM_Serif_Display({
  weight: "400",
  variable: "--font-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "16Pulse",
  description: "Smart booking management for modern businesses.",
  manifest: "/manifest.json",
  appleWebApp: {
    title: "16Pulse",
    statusBarStyle: "default",
    capable: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${dmSerif.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <PwaProvider />
        {children}
      </body>
    </html>
  );
}
