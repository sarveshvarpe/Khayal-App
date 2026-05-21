"use client"

import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { motion } from "framer-motion"
import { Activity, Sparkles, Shield, ArrowRight, LayoutDashboard, MessageSquare } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

export default function Hero() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-500/5 via-transparent to-accent-500/5" />
      </section>
    )
  }

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden px-4">
      <div className="absolute inset-0 bg-gradient-to-b from-primary-500/5 via-transparent to-accent-500/5" />

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex justify-center mb-6">
            <div className="p-3 rounded-2xl glass inline-block">
              <Activity className="w-12 h-12 text-primary-500" />
            </div>
          </div>

          {user ? (
            <>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
                Welcome back,
                <br />
                <span className="gradient-text">{user.full_name?.split(" ")[0]}!</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-500 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
                Ready to take charge of your health today? Review your daily insights, manage appointments, and track your wellness seamlessly.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/dashboard">
                  <Button size="lg" className="gap-2">
                    <LayoutDashboard className="w-4 h-4" /> Go to Dashboard
                  </Button>
                </Link>
                <Link href="/chat">
                  <Button variant="outline" size="lg" className="gap-2">
                    <MessageSquare className="w-4 h-4" /> Chat with AI
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
                Your AI-Powered
                <br />
                <span className="gradient-text">Health Companion</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-500 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
                Experience the future of healthcare with AI-driven insights, smart appointment booking,
                medicine tracking, and personalized wellness plans — all in one place.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/signup">
                  <Button size="lg" className="gap-2">
                    Get Started Free <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" size="lg">
                    Sign In
                  </Button>
                </Link>
              </div>
            </>
          )}

          <div className="flex flex-wrap justify-center gap-8 mt-12">
            {[
              { icon: Sparkles, text: "AI-Powered Insights" },
              { icon: Shield, text: "HIPAA Compliant" },
              { icon: Activity, text: "Real-time Tracking" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"
              >
                <item.icon className="w-4 h-4 text-primary-500" />
                <span>{item.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  )
}
