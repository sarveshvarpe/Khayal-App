"use client"

import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/Button"
import { Activity, Menu, X } from "lucide-react"
import { useState } from "react"

export default function Header() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-40 glass">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Activity className="w-8 h-8 text-primary-500" />
          <span className="text-xl font-bold gradient-text">Khayal</span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <Link href="/" className="hover:text-primary-500 transition-colors">Home</Link>
          <Link href="/chat" className="hover:text-primary-500 transition-colors">AI Assistant</Link>
          <Link href="/appointments" className="hover:text-primary-500 transition-colors">Appointments</Link>
          <Link href="/medicines" className="hover:text-primary-500 transition-colors">Medicines</Link>
          <Link href="/fitness" className="hover:text-primary-500 transition-colors">Fitness</Link>
          {user ? (
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="outline" size="sm">Dashboard</Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={logout}>Logout</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login"><Button variant="outline" size="sm">Login</Button></Link>
              <Link href="/signup"><Button size="sm">Sign Up</Button></Link>
            </div>
          )}
        </div>

        <button className="md:hidden" onClick={() => setOpen(!open)}>
          {open ? <X /> : <Menu />}
        </button>
      </nav>

      {open && (
        <div className="md:hidden glass border-t border-white/10 p-4 flex flex-col gap-3">
          <Link href="/" onClick={() => setOpen(false)}>Home</Link>
          <Link href="/chat" onClick={() => setOpen(false)}>AI Assistant</Link>
          <Link href="/appointments" onClick={() => setOpen(false)}>Appointments</Link>
          <Link href="/medicines" onClick={() => setOpen(false)}>Medicines</Link>
          <Link href="/fitness" onClick={() => setOpen(false)}>Fitness</Link>
          {user ? (
            <>
              <Link href="/dashboard" onClick={() => setOpen(false)}>Dashboard</Link>
              <button onClick={() => { logout(); setOpen(false) }}>Logout</button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setOpen(false)}>Login</Link>
              <Link href="/signup" onClick={() => setOpen(false)}>Sign Up</Link>
            </>
          )}
        </div>
      )}
    </header>
  )
}
