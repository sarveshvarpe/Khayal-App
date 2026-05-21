"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api"
import { motion } from "framer-motion"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts"
import { Users, Calendar, Activity, Shield, TrendingUp, UserCheck } from "lucide-react"

const COLORS = ["#22c55e", "#0ea5e9", "#8b5cf6", "#f59e0b", "#ef4444"]

export default function AdminPage() {
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState({
    total_users: 0, total_appointments: 0, verified_users: 0
  })
  const [users, setUsers] = useState<any[]>([])

  useEffect(() => {
    if (!user || user.role !== "admin") return
    api.get<typeof analytics>("/admin/analytics").then(setAnalytics).catch(() => {})
    api.get<any[]>("/admin/users").then(setUsers).catch(() => {})
  }, [user])

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-[90vh] flex items-center justify-center">
        <div className="text-center glass p-8 rounded-2xl">
          <Shield className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-bold mb-2">Admin Access Required</h2>
          <p className="text-gray-500">You need admin privileges to access this panel.</p>
        </div>
      </div>
    )
  }

  const stats = [
    { icon: Users, label: "Total Users", value: analytics.total_users, color: "text-green-500", bg: "bg-green-500/10" },
    { icon: Calendar, label: "Appointments", value: analytics.total_appointments, color: "text-blue-500", bg: "bg-blue-500/10" },
    { icon: UserCheck, label: "Verified Users", value: analytics.verified_users, color: "text-purple-500", bg: "bg-purple-500/10" },
    { icon: TrendingUp, label: "Active Today", value: "—", color: "text-orange-500", bg: "bg-orange-500/10" },
  ]

  const pieData = [
    { name: "Patients", value: users.filter(u => u.role === "patient").length || 1 },
    { name: "Doctors", value: users.filter(u => u.role === "doctor").length || 1 },
    { name: "Admins", value: users.filter(u => u.role === "admin").length || 1 },
  ]

  return (
    <div className="min-h-[90vh] max-w-7xl mx-auto p-4 md:p-8">
      <h1 className="text-2xl md:text-3xl font-bold gradient-text mb-2">Admin Dashboard</h1>
      <p className="text-gray-500 mb-8">Platform overview and management</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass p-4 rounded-xl card-hover"
          >
            <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
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
          <h2 className="text-lg font-semibold mb-4">User Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {pieData.map((d, i) => (
              <div key={i} className="flex items-center gap-1 text-xs">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                <span>{d.name}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass p-6 rounded-2xl"
        >
          <h2 className="text-lg font-semibold mb-4">Recent Users</h2>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {users.slice(0, 10).map((u) => (
              <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                <div>
                  <p className="text-sm font-medium">{u.full_name}</p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  u.role === "admin" ? "bg-purple-500/20 text-purple-500" :
                  u.role === "doctor" ? "bg-blue-500/20 text-blue-500" :
                  "bg-green-500/20 text-green-500"
                }`}>{u.role}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
