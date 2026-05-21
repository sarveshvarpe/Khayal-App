import Hero from "@/components/Hero"
import Features from "@/components/Features"

export default function Home() {
  return (
    <div className="min-h-screen">
      <Hero />
      <Features />
      <footer className="py-8 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-800">
        <p>&copy; 2024 Khayal Healthcare. All rights reserved.</p>
      </footer>
    </div>
  )
}
