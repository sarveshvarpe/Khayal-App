"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { motion } from "framer-motion"
import { FlaskConical, Plus, Calendar, Clock, MapPin } from "lucide-react"
import { toast } from "sonner"
import type { LabTest } from "@/types"
import type { MapMarker } from "@/components/Map"

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => <div className="w-full h-[400px] rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />,
})

interface Lab {
  name: string
  address: string
  phone: string
  test_types: string[]
  lat: number
  lng: number
}

export default function LabsPage() {
  const { user } = useAuth()
  const [tests, setTests] = useState<LabTest[]>([])
  const [showForm, setShowForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [labs, setLabs] = useState<Lab[]>([])
  const [form, setForm] = useState({
    lab_name: "", lab_address: "", lab_phone: "", test_type: "",
    appointment_date: "", appointment_time: "", notes: ""
  })

  useEffect(() => {
    if (!user) return
    api.get<LabTest[]>("/labs").then(setTests).catch(() => {})
    api.get<{ labs: Lab[] }>("/labs/search-labs").then(res => setLabs(res.labs)).catch(() => {})
  }, [user])

  const filteredLabs = labs.filter(l =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.test_types.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const mapMarkers: MapMarker[] = filteredLabs.map(l => ({
    lat: l.lat,
    lng: l.lng,
    name: l.name,
    address: l.address,
    phone: l.phone,
    description: l.test_types.join(", "),
  }))

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const test = await api.post<LabTest>("/labs", form)
      setTests(prev => [test, ...prev])
      setShowForm(false)
      setForm({ lab_name: "", lab_address: "", lab_phone: "", test_type: "", appointment_date: "", appointment_time: "", notes: "" })
      toast.success("Lab test booked!")
    } catch (err: any) {
      toast.error(err.message || "Failed to book")
    }
  }

  const fillLab = (lab: Lab) => {
    setForm({
      ...form,
      lab_name: lab.name,
      lab_address: lab.address,
      lab_phone: lab.phone,
    })
    setShowForm(true)
  }

  return (
    <div className="min-h-[90vh] max-w-7xl mx-auto p-4 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold gradient-text">Lab Tests</h1>
          <p className="text-gray-500 mt-1">Book and manage lab tests</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Book Test
        </Button>
      </div>

      <div className="relative mb-6">
        <Input
          placeholder="Search labs or test types..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-6 rounded-2xl mb-6"
        >
          <form onSubmit={handleBook} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input placeholder="Lab Name" value={form.lab_name} onChange={(e) => setForm({...form, lab_name: e.target.value})} required />
            <Input placeholder="Test Type" value={form.test_type} onChange={(e) => setForm({...form, test_type: e.target.value})} required />
            <Input placeholder="Address" value={form.lab_address} onChange={(e) => setForm({...form, lab_address: e.target.value})} />
            <Input placeholder="Phone" value={form.lab_phone} onChange={(e) => setForm({...form, lab_phone: e.target.value})} />
            <Input type="date" value={form.appointment_date} onChange={(e) => setForm({...form, appointment_date: e.target.value})} />
            <Input type="time" value={form.appointment_time} onChange={(e) => setForm({...form, appointment_time: e.target.value})} />
            <Input placeholder="Notes" value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} className="md:col-span-2" />
            <Button type="submit" className="md:col-span-2">Book Test</Button>
          </form>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Your Tests</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tests.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass p-4 rounded-xl"
              >
                <div className="flex items-center gap-3 mb-2">
                  <FlaskConical className="w-5 h-5 text-primary-500" />
                  <div>
                    <p className="font-medium">{t.test_type}</p>
                    <p className="text-xs text-gray-500">{t.lab_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar className="w-3 h-3" /> {t.appointment_date || "Pending"}
                  <Clock className="w-3 h-3 ml-2" /> {t.appointment_time || "Pending"}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full mt-2 inline-block ${
                  t.status === "booked" ? "bg-green-500/20 text-green-500" : "bg-gray-500/20 text-gray-500"
                }`}>{t.status}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Nearby Labs</h2>
          <div className="mb-4">
            <Map markers={mapMarkers} className="w-full h-[250px] rounded-xl z-0" />
          </div>
          <div className="space-y-3">
            {filteredLabs.map((lab, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass p-4 rounded-xl cursor-pointer card-hover"
                onClick={() => fillLab(lab)}
              >
                <h3 className="font-medium text-sm">{lab.name}</h3>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3" /> {lab.address}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {lab.test_types.map((t: string, j: number) => (
                    <span key={j} className="text-xs px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-500">
                      {t}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
