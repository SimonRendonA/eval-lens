import type { Metadata } from "next";
import { DM_Sans, DM_Mono, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Analytics } from "@vercel/analytics/next";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const dmSans = DM_Sans({
  subsets: ["latin"],
});

const dmMono = DM_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-dm-mono",
});

export const metadata: Metadata = {
  title: "EvalLens",
  description: "Evaluate structured LLM outputs with precision.",
  icons: {
    icon: "/eval-lens/logo/favicon.svg",
    apple: "/eval-lens/logo/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    siteName: "EvalLens",
    title: "EvalLens",
    description: "Evaluate structured LLM outputs with precision.",
    images: [
      {
        url: "/eval-lens/logo/og-image.png",
        width: 1200,
        height: 630,
        alt: "EvalLens - Evaluate structured LLM outputs with precision.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "EvalLens",
    description: "Evaluate structured LLM outputs with precision.",
    images: ["/eval-lens/logo/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className={`${dmSans.className} ${dmMono.variable} antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
