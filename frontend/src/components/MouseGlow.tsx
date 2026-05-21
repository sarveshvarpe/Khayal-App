"use client"

import { useEffect, useState } from "react"

export default function MouseGlow() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const updateMousePosition = (e: MouseEvent) => {
      document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
    }

    window.addEventListener("mousemove", updateMousePosition)
    return () => window.removeEventListener("mousemove", updateMousePosition)
  }, [])

  if (!mounted) return null

  return (
    <div 
      className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-300"
      style={{
        background: `radial-gradient(800px circle at var(--mouse-x, 50vw) var(--mouse-y, 50vh), rgba(14, 165, 233, 0.15), transparent 40%)`
      }}
    />
  )
}
