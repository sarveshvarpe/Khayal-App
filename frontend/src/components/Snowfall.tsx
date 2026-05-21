"use client"

import { useEffect, useRef } from "react"

export default function Snowfall() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let width = window.innerWidth
    let height = window.innerHeight
    canvas.width = width
    canvas.height = height

    let mouseX = -1000
    let mouseY = -1000

    const updateMouse = (e: MouseEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY
    }
    
    const resetMouse = () => {
      mouseX = -1000
      mouseY = -1000
    }

    window.addEventListener("mousemove", updateMouse)
    window.addEventListener("mouseout", resetMouse)
    
    const handleResize = () => {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width
      canvas.height = height
    }
    window.addEventListener("resize", handleResize)

    class Flake {
      x: number
      y: number
      radius: number
      speedY: number
      speedX: number
      baseSpeedX: number
      opacity: number
      
      constructor() {
        this.x = Math.random() * width
        this.y = Math.random() * height
        this.radius = Math.random() * 1.5 + 0.5
        this.speedY = Math.random() * 1 + 0.5
        this.baseSpeedX = Math.random() * 1 - 0.5
        this.speedX = this.baseSpeedX
        this.opacity = Math.random() * 0.5 + 0.2
      }

      update() {
        this.y += this.speedY
        this.x += this.speedX
        
        // Gradually return to normal horizontal drift
        this.speedX += (this.baseSpeedX - this.speedX) * 0.05

        // Repel from mouse
        const dx = this.x - mouseX
        const dy = this.y - mouseY
        const distance = Math.sqrt(dx * dx + dy * dy)
        const repelRadius = 150

        if (distance < repelRadius) {
          const force = (repelRadius - distance) / repelRadius
          // push away from the cursor
          this.x += (dx / distance) * force * 6
          this.y += (dy / distance) * force * 2
        }

        // Wrap around edges
        if (this.y > height) {
          this.y = -10
          this.x = Math.random() * width
          this.speedX = this.baseSpeedX
        }
        if (this.x > width + 10) this.x = -10
        if (this.x < -10) this.x = width + 10
      }

      draw() {
        if (!ctx) return
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`
        ctx.fill()
      }
    }

    const flakes: Flake[] = Array.from({ length: 200 }, () => new Flake())
    let animationFrame: number

    const render = () => {
      ctx.clearRect(0, 0, width, height)
      flakes.forEach(flake => {
        flake.update()
        flake.draw()
      })
      animationFrame = requestAnimationFrame(render)
    }
    
    render()

    return () => {
      window.removeEventListener("mousemove", updateMouse)
      window.removeEventListener("mouseout", resetMouse)
      window.removeEventListener("resize", handleResize)
      cancelAnimationFrame(animationFrame)
    }
  }, [])

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 pointer-events-none z-40" 
    />
  )
}
