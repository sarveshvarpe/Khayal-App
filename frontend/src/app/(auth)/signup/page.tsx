"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { motion } from "framer-motion"
import { Activity, Mail, Lock, User, Calendar, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"

export default function SignupPage() {
  const [form, setForm] = useState({
    full_name: "", email: "", age: 0, password: "", confirm_password: ""
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [step, setStep] = useState<"signup" | "otp">("signup")
  const [otp, setOtp] = useState("")
  const [otpValue, setOtpValue] = useState("")
  const [loading, setLoading] = useState(false)
  const { signup } = useAuth()
  const router = useRouter()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirm_password) {
      toast.error("Passwords do not match")
      return
    }
    setLoading(true)
    try {
      await signup(form)
      const otpRes = await api.post<{ message: string; success?: boolean; sent?: boolean; otp?: string }>("/auth/send-otp", { email: form.email })
      setStep("otp")
      if (otpRes.success || otpRes.sent) {
        toast.success(otpRes.message || "OTP sent to your email")
      } else {
        toast.warning(otpRes.message || "Email delivery failed — use the code shown below")
        setOtpValue(otpRes.otp || "")
      }
    } catch (err: any) {
      toast.error(err.message || "Signup failed")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async () => {
    setLoading(true)
    try {
      await api.post("/auth/verify-otp", { email: form.email, otp })
      toast.success("Email verified! Welcome to Khayal.")
      router.push("/dashboard")
    } catch (err: any) {
      toast.error(err.message || "OTP verification failed")
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    try {
      const res = await api.post<{ message: string; success?: boolean; sent?: boolean; otp?: string }>("/auth/resend-otp", { email: form.email })
      if (res.success || res.sent) {
        setOtpValue("")
        toast.success(res.message || "OTP resent to your email")
      } else {
        setOtpValue(res.otp || "")
        toast.warning(res.message || "Email delivery failed — use the code shown below")
      }
    } catch {
      toast.error("Failed to resend OTP")
    }
  }

  return (
    <div className="min-h-[90vh] flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="glass p-8 rounded-2xl">
          <div className="text-center mb-8">
            <Activity className="w-10 h-10 text-primary-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold gradient-text">Create Account</h1>
            <p className="text-sm text-gray-500 mt-2">Join Khayal for better health</p>
          </div>

          {step === "signup" ? (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="John Doe"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Age</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="number"
                    placeholder="25"
                    value={form.age || ""}
                    onChange={(e) => setForm({ ...form, age: parseInt(e.target.value) || 0 })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="pl-10 pr-10"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                    {showPassword ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type={showConfirm ? "text" : "password"}
                    placeholder="••••••••"
                    value={form.confirm_password}
                    onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                    className="pl-10 pr-10"
                    required
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2">
                    {showConfirm ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating account..." : "Create Account"}
              </Button>

              <p className="text-center text-sm text-gray-500 mt-4">
                Already have an account?{" "}
                <Link href="/login" className="text-primary-500 hover:underline">Sign in</Link>
              </p>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 text-center">Enter the OTP sent to {form.email}</p>
              {otpValue && (
                <div className="text-center p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <p className="text-xs text-yellow-600 mb-1">Email delivery unavailable - use this code:</p>
                  <p className="text-2xl font-bold tracking-widest text-yellow-600">{otpValue}</p>
                </div>
              )}
              <Input
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                className="text-center text-lg tracking-widest"
              />
              <Button className="w-full" onClick={handleVerifyOTP} disabled={loading || otp.length !== 6}>
                {loading ? "Verifying..." : "Verify OTP"}
              </Button>
              <Button variant="ghost" className="w-full" onClick={handleResendOTP}>
                Resend OTP
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
