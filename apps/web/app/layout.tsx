// Place this file at: apps/web/src/app/layout.tsx

import type { Metadata } from "next"
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { QueryProvider } from "@/components/providers/query-provider"

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
})

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  // Needed so the share image gets an absolute URL. Set NEXT_PUBLIC_SITE_URL
  // to your deployed address (e.g. https://signal.vercel.app).
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "Signal — Ask your codebase. Verify every answer.",
    template: "%s",
  },
  description:
    "Signal is an AI workspace that answers questions about any repository and cites the exact file and lines behind every claim.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans text-[color:var(--color-text)]">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}
