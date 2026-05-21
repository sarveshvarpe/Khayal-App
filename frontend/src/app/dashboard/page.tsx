"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/Button"
import { motion } from "framer-motion"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import {
  Heart, Activity, Droplets, Moon, Stethoscope, Pill,
  TrendingUp, Calendar, Bell, Download, User, Plus
} from "lucide-react"
import { toast } from "sonner"
import type { Appointment, Medicine, FitnessProgress } from "@/types"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import PrintableReport from "@/components/PrintableReport"

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [fitness, setFitness] = useState<FitnessProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!authLoading && !user) router.push("/login")
  }, [user, authLoading, router])

  useEffect(() => {
    if (!user) return
    Promise.all([
      api.get<Appointment[]>("/appointments").catch(() => []),
      api.get<Medicine[]>("/medicines").catch(() => []),
      api.get<FitnessProgress[]>("/fitness/progress").catch(() => []),
    ]).then(([apps, meds, fit]) => {
      setAppointments(apps)
      setMedicines(meds)
      setFitness(fit)
      setLoading(false)
    })
  }, [user])

  const handleExportPDF = async () => {
    if (!reportRef.current) return
    
    setIsExporting(true)
    toast.info("Generating PDF report...")
    
    try {
      const element = reportRef.current
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
      })
      
      const imgData = canvas.toDataURL("image/jpeg", 1.0)
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      })
      
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight)
      pdf.save("Khayal_Health_Report.pdf")
      
      toast.success("PDF downloaded successfully!")
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast.error("Failed to generate PDF")
    } finally {
      setIsExporting(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-[90vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const chartData = fitness.map(f => ({
    date: new Date(f.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    steps: f.steps || 0,
    calories: f.calories || 0,
  }))

  const todayFitness = fitness[0] || {}

  const widgets = [
    { icon: Droplets, label: "Water Intake", value: `${(todayFitness as any).water_intake || 0} glasses`, color: "text-blue-500", bg: "bg-blue-500/10" },
    { icon: Moon, label: "Sleep", value: `${(todayFitness as any).sleep_hours || 0} hrs`, color: "text-purple-500", bg: "bg-purple-500/10" },
    { icon: Activity, label: "Steps", value: `${(todayFitness as any).steps || 0}`, color: "text-green-500", bg: "bg-green-500/10" },
    { icon: TrendingUp, label: "Calories", value: `${(todayFitness as any).calories || 0} kcal`, color: "text-orange-500", bg: "bg-orange-500/10" },
  ]

  return (
    <div className="min-h-[90vh] p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold gradient-text">Welcome back, {user?.full_name?.split(" ")[0]}</h1>
          <p className="text-gray-500 mt-1">Here&apos;s your health overview</p>
        </div>
        <Button onClick={handleExportPDF} disabled={isExporting} className="gap-2">
          {isExporting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Download className="w-4 h-4" />} 
          {isExporting ? "Exporting..." : "Export Report"}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {widgets.map((w, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass p-4 rounded-xl card-hover"
          >
            <div className={`w-10 h-10 rounded-lg ${w.bg} flex items-center justify-center mb-3`}>
              <w.icon className={`w-5 h-5 ${w.color}`} />
            </div>
            <p className="text-2xl font-bold">{w.value}</p>
            <p className="text-xs text-gray-500">{w.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass p-6 rounded-2xl"
        >
          <h2 className="text-lg font-semibold mb-4">Activity Trends</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" />
                <YAxis stroke="rgba(255,255,255,0.3)" />
                <Tooltip />
                <Line type="monotone" dataKey="steps" stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="calories" stroke="#0ea5e9" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">No activity data yet. Start tracking!</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass p-6 rounded-2xl"
        >
          <h2 className="text-lg font-semibold mb-4">Upcoming Appointments</h2>
          {appointments.length > 0 ? (
            <div className="space-y-3">
              {appointments.slice(0, 3).map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                  <Stethoscope className="w-8 h-8 text-primary-500" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{a.doctor_name}</p>
                    <p className="text-xs text-gray-500">{a.doctor_specialization} - {a.appointment_date}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    a.status === "scheduled" ? "bg-green-500/20 text-green-500" : "bg-gray-500/20 text-gray-500"
                  }`}>
                    {a.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No upcoming appointments</p>
          )}
          <Button variant="outline" size="sm" className="w-full mt-4" onClick={() => router.push("/appointments")}>
            <Calendar className="w-4 h-4 mr-2" /> Book Appointment
          </Button>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass p-6 rounded-2xl"
        >
          <h2 className="text-lg font-semibold mb-4">Medicine Reminders</h2>
          {medicines.length > 0 ? (
            <div className="space-y-3">
              {medicines.slice(0, 4).map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                  <Pill className="w-8 h-8 text-accent-500" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{m.name}</p>
                    <p className="text-xs text-gray-500">{m.dosage} - {m.frequency}</p>
                  </div>
                  <span className="text-xs text-gray-500">Stock: {m.stock_count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No medicines added</p>
          )}
          <Button variant="outline" size="sm" className="w-full mt-4" onClick={() => router.push("/medicines")}>
            <Plus className="w-4 h-4 mr-2" /> Add Medicine
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass p-6 rounded-2xl"
        >
          <h2 className="text-lg font-semibold mb-4">Recent Notifications</h2>
          {[
            { icon: Bell, text: "Time to take your medicine", time: "10 min ago", color: "text-accent-500" },
            { icon: Heart, text: "Your health report is ready", time: "1 hour ago", color: "text-red-500" },
            { icon: Activity, text: "Daily step goal achieved!", time: "3 hours ago", color: "text-green-500" },
          ].map((n, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 mb-2">
              <n.icon className={`w-4 h-4 ${n.color}`} />
              <div className="flex-1">
                <p className="text-sm">{n.text}</p>
                <p className="text-xs text-gray-500">{n.time}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
      
      <PrintableReport 
        ref={reportRef} 
        user={user} 
        appointments={appointments} 
        medicines={medicines} 
        fitness={fitness} 
      />
    </div>
  )
}
