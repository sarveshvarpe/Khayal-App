"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { motion } from "framer-motion"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"
import { Dumbbell, Weight, Footprints, Flame, Apple, Plus, Target } from "lucide-react"
import { toast } from "sonner"
import type { FitnessProgress } from "@/types"

export default function FitnessPage() {
  const { user } = useAuth()
  const [progress, setProgress] = useState<FitnessProgress[]>([])
  const [bmi, setBmi] = useState<{ bmi: number; category: string } | null>(null)
  const [form, setForm] = useState({
    weight: "", height: "", steps: "", calories: "", water_intake: "", sleep_hours: "", date: new Date().toISOString().split("T")[0]
  })
  const [bmiForm, setBmiForm] = useState({ height: "", weight: "" })

  useEffect(() => {
    if (!user) return
    api.get<FitnessProgress[]>("/fitness/progress").then(setProgress).catch(() => {})
  }, [user])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const data = {
        ...form,
        weight: form.weight ? parseFloat(form.weight) : null,
        height: form.height ? parseFloat(form.height) : null,
        steps: parseInt(form.steps) || 0,
        calories: parseFloat(form.calories) || 0,
        water_intake: parseInt(form.water_intake) || 0,
        sleep_hours: parseFloat(form.sleep_hours) || 0,
        date: form.date,
      }
      const res = await api.post<FitnessProgress>("/fitness/progress", data)
      setProgress(prev => [res, ...prev])
      setForm({ weight: "", height: "", steps: "", calories: "", water_intake: "", sleep_hours: "", date: new Date().toISOString().split("T")[0] })
      toast.success("Progress saved!")
    } catch (err: any) {
      toast.error(err.message || "Failed to save")
    }
  }

  const handleBMI = async () => {
    try {
      const res = await api.post<{ bmi: number; category: string }>(
        `/fitness/bmi?height=${parseFloat(bmiForm.height)}&weight=${parseFloat(bmiForm.weight)}`
      )
      setBmi(res)
    } catch {
      toast.error("Invalid values")
    }
  }

  const chartData = progress.slice(0, 14).reverse().map(p => ({
    date: new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    steps: p.steps || 0,
    calories: p.calories || 0,
    water: p.water_intake || 0,
  }))

  return (
    <div className="min-h-[90vh] max-w-7xl mx-auto p-4 md:p-8">
      <h1 className="text-2xl md:text-3xl font-bold gradient-text mb-2">Fitness & Wellness</h1>
      <p className="text-gray-500 mb-8">Track your fitness journey</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-6 rounded-2xl lg:col-span-2"
        >
          <h2 className="text-lg font-semibold mb-4">Activity Log</h2>
          <form onSubmit={handleAdd} className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Input type="number" placeholder="Weight (kg)" value={form.weight} onChange={(e) => setForm({...form, weight: e.target.value})} />
            <Input type="number" placeholder="Height (cm)" value={form.height} onChange={(e) => setForm({...form, height: e.target.value})} />
            <Input type="number" placeholder="Steps" value={form.steps} onChange={(e) => setForm({...form, steps: e.target.value})} />
            <Input type="number" placeholder="Calories" value={form.calories} onChange={(e) => setForm({...form, calories: e.target.value})} />
            <Input type="number" placeholder="Water (glasses)" value={form.water_intake} onChange={(e) => setForm({...form, water_intake: e.target.value})} />
            <Input type="number" placeholder="Sleep (hrs)" value={form.sleep_hours} onChange={(e) => setForm({...form, sleep_hours: e.target.value})} />
            <Input type="date" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} className="col-span-2 md:col-span-3" />
            <Button type="submit" className="col-span-2 md:col-span-3">Log Activity</Button>
          </form>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass p-6 rounded-2xl"
        >
          <h2 className="text-lg font-semibold mb-4">BMI Calculator</h2>
          <div className="space-y-3">
            <Input type="number" placeholder="Height (cm)" value={bmiForm.height} onChange={(e) => setBmiForm({...bmiForm, height: e.target.value})} />
            <Input type="number" placeholder="Weight (kg)" value={bmiForm.weight} onChange={(e) => setBmiForm({...bmiForm, weight: e.target.value})} />
            <Button className="w-full" onClick={handleBMI}>Calculate BMI</Button>
            {bmi && (
              <div className="text-center p-3 rounded-lg bg-white/5">
                <p className="text-3xl font-bold gradient-text">{bmi.bmi}</p>
                <p className="text-sm text-gray-500">{bmi.category}</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass p-6 rounded-2xl"
        >
          <h2 className="text-lg font-semibold mb-4">Steps & Calories</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" />
                <YAxis stroke="rgba(255,255,255,0.3)" />
                <Tooltip />
                <Bar dataKey="steps" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="calories" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">Start logging your activity to see charts</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass p-6 rounded-2xl"
        >
          <h2 className="text-lg font-semibold mb-4">Water & Sleep</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" />
                <YAxis stroke="rgba(255,255,255,0.3)" />
                <Tooltip />
                <Line type="monotone" dataKey="water" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="water" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">Start logging water and sleep to see charts</p>
          )}
        </motion.div>
      </div>
    </div>
  )
}
