import type { Metadata } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";

const barlow = Barlow({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-barlow',
})

const barlowCondensed = Barlow_Condensed({
  weight: ['400', '600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-barlow-condensed',
})

export const metadata: Metadata = {
  title: "Family Picks",
  description: "2026 NFL Pick'em",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full ${barlow.variable} ${barlowCondensed.variable}`}>
      <body className="h-full">{children}</body>
    </html>
  );
}
