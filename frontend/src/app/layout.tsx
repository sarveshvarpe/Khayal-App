import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/lib/auth-context"
import ThemeToggle from "@/components/ThemeToggle"
import MouseGlow from "@/components/MouseGlow"
import Snowfall from "@/components/Snowfall"
import Header from "@/components/layout/Header"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Khayal - AI-Powered Healthcare Platform",
  description: "Your complete AI-powered healthcare and wellness companion",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          <ThemeToggle />
          <MouseGlow />
          <Snowfall />
          <Header />
          <main className="pt-16">{children}</main>
        </AuthProvider>
      </body>
    </html>
  )
}
