"use client"

import { Heart, Activity, Brain, Apple, Stethoscope, Pill } from "lucide-react"
import Link from "next/link"

const features = [
  { icon: Brain, title: "AI Health Assistant", desc: "24/7 intelligent health companion powered by advanced AI", href: "/chat" },
  { icon: Stethoscope, title: "Doctor Appointments", desc: "Find and book appointments with the best doctors near you", href: "/appointments" },
  { icon: Pill, title: "Medicine Tracking", desc: "Never miss a dose with smart reminders and prescription OCR", href: "/medicines" },
  { icon: Activity, title: "Fitness Tracking", desc: "Track workouts, diet, steps, and achieve your fitness goals", href: "/fitness" },
  { icon: Heart, title: "Health Analytics", desc: "Comprehensive health insights with beautiful visualizations", href: "/dashboard" },
  { icon: Apple, title: "Diet & Nutrition", desc: "Personalized diet plans and calorie tracking", href: "/fitness" },
]

export default function Features() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 gradient-text">
          Everything You Need for Better Health
        </h2>
        <p className="text-center text-gray-500 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
          Khayal brings together AI, healthcare, and fitness in one beautiful platform
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <Link href={f.href} key={i}>
              <div className="glass p-6 rounded-2xl card-hover h-full flex flex-col items-start cursor-pointer transition-colors hover:bg-white/5 dark:hover:bg-slate-800/50">
                <f.icon className="w-10 h-10 text-primary-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{f.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
