"use client"

import { cn } from "@/lib/utils"
import { type InputHTMLAttributes, forwardRef } from "react"

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all",
          className
        )}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
