import type { Metadata } from "next";
import { DM_Mono, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Analytics } from "@vercel/analytics/next";

// Geist is the UI typeface. Its CSS variable is consumed by `font-sans` in
// Tailwind, so applying `geist.variable` on <html> is sufficient.
const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const dmMono = DM_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-dm-mono",
});

const configuredSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

const metadataBase = new URL(configuredSiteUrl ?? "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase,
  title: "EvalLens - Evaluate LLM Structured Outputs",
  description:
    "Catch schema drift before production. Evaluate structured LLM outputs and inspect failures row by row.",
  icons: {
    icon: "/eval-lens/logo/favicon.svg",
    apple: "/eval-lens/logo/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    siteName: "EvalLens",
    title: "EvalLens - Evaluate LLM Structured Outputs",
    description:
      "Catch schema drift before production. Evaluate structured LLM outputs with clear, row-level failure reasons.",
    images: [
      {
        url: "/eval-lens/logo/og-image.png",
        width: 1200,
        height: 630,
        alt: "EvalLens dashboard for structured LLM output evaluation.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "EvalLens - Evaluate LLM Structured Outputs",
    description:
      "Catch schema drift before production and inspect row-level failures.",
    images: ["/eval-lens/logo/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable, dmMono.variable)}>
      <body className="antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
