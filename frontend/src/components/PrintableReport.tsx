"use client"

import React, { forwardRef } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import type { Appointment, Medicine, FitnessProgress } from "@/types"

interface PrintableReportProps {
  user: { full_name: string; email: string } | null
  appointments: Appointment[]
  medicines: Medicine[]
  fitness: FitnessProgress[]
}

const PrintableReport = forwardRef<HTMLDivElement, PrintableReportProps>(
  ({ user, appointments, medicines, fitness }, ref) => {
    
    const chartData = fitness.map(f => ({
      date: new Date(f.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      steps: f.steps || 0,
      calories: f.calories || 0,
    })).reverse() // Show chronological if it was descending

    const todayFitness = fitness[0] || {}

    const currentDate = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    return (
      <div 
        className="absolute -left-[9999px] top-0 bg-white" 
        style={{ width: "800px", minHeight: "1123px", color: "black", fontFamily: "sans-serif" }}
      >
        <div ref={ref} className="p-12 bg-white h-full flex flex-col" style={{ width: "800px", color: "black" }}>
          
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-gray-800 pb-6 mb-8">
            <div>
              <h1 className="text-4xl font-bold text-black tracking-tight">Khayal</h1>
              <p className="text-gray-500 mt-1 uppercase tracking-widest text-xs font-semibold">Comprehensive Health Report</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-lg">{user?.full_name || "Patient"}</p>
              <p className="text-sm text-gray-600">{user?.email}</p>
              <p className="text-sm text-gray-500 mt-2">{currentDate}</p>
            </div>
          </div>

          {/* Vitals / Today's Summary */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-black border-b border-gray-300 pb-2 mb-4">Today's Vitals Overview</h2>
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Water Intake</p>
                <p className="text-2xl font-bold mt-1 text-blue-600">{(todayFitness as any).water_intake || 0} <span className="text-sm font-normal text-gray-500">glasses</span></p>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Sleep</p>
                <p className="text-2xl font-bold mt-1 text-purple-600">{(todayFitness as any).sleep_hours || 0} <span className="text-sm font-normal text-gray-500">hrs</span></p>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Steps</p>
                <p className="text-2xl font-bold mt-1 text-green-600">{(todayFitness as any).steps || 0}</p>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Calories Burned</p>
                <p className="text-2xl font-bold mt-1 text-orange-600">{(todayFitness as any).calories || 0} <span className="text-sm font-normal text-gray-500">kcal</span></p>
              </div>
            </div>
          </div>

          {/* Activity Trends Chart */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-black border-b border-gray-300 pb-2 mb-4">Activity Trends (Last 7 Days)</h2>
            <div className="p-4 border border-gray-200 rounded-lg" style={{ height: "300px" }}>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px' }} />
                    <Line type="monotone" dataKey="steps" stroke="#22c55e" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Steps" />
                    <Line type="monotone" dataKey="calories" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Calories" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-center py-12">No activity data available.</p>
              )}
            </div>
          </div>

          {/* Medical Summary */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            
            {/* Medications Table */}
            <div>
              <h2 className="text-xl font-bold text-black border-b border-gray-300 pb-2 mb-4">Current Medications</h2>
              {medicines.length > 0 ? (
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 text-gray-700 font-semibold">
                    <tr>
                      <th className="py-2 px-3 rounded-tl-lg">Medicine Name</th>
                      <th className="py-2 px-3">Dosage</th>
                      <th className="py-2 px-3 rounded-tr-lg">Timing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {medicines.map((m, i) => (
                      <tr key={m.id} className="border-b border-gray-100">
                        <td className="py-3 px-3 font-medium text-black">{m.name}</td>
                        <td className="py-3 px-3 text-gray-700">{m.dosage}</td>
                        <td className="py-3 px-3 text-gray-700">{m.frequency}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-500 text-sm italic py-2">No active medications recorded.</p>
              )}
            </div>

            {/* Upcoming Appointments Table */}
            <div>
              <h2 className="text-xl font-bold text-black border-b border-gray-300 pb-2 mb-4">Upcoming Appointments</h2>
              {appointments.length > 0 ? (
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 text-gray-700 font-semibold">
                    <tr>
                      <th className="py-2 px-3 rounded-tl-lg">Doctor</th>
                      <th className="py-2 px-3">Specialty</th>
                      <th className="py-2 px-3 rounded-tr-lg">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.slice(0, 5).map((a, i) => (
                      <tr key={a.id} className="border-b border-gray-100">
                        <td className="py-3 px-3 font-medium text-black">{a.doctor_name}</td>
                        <td className="py-3 px-3 text-gray-700">{a.doctor_specialization}</td>
                        <td className="py-3 px-3 text-gray-700">{a.appointment_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-500 text-sm italic py-2">No upcoming appointments scheduled.</p>
              )}
            </div>

          </div>

          {/* Footer */}
          <div className="mt-auto pt-8 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-400">This report was generated by Khayal AI Health Assistant. This document is for informational purposes only and does not replace professional medical advice.</p>
            <p className="text-xs font-semibold text-gray-400 mt-1">Report ID: KHL-{Math.random().toString(36).substr(2, 9).toUpperCase()} | Page 1 of 1</p>
          </div>

        </div>
      </div>
    )
  }
)

PrintableReport.displayName = "PrintableReport"

export default PrintableReport
