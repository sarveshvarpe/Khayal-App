"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { motion, AnimatePresence } from "framer-motion"
import {
  Stethoscope, MapPin, Calendar, Clock, Search, Plus, X,
  Locate, Loader2, Phone, Star, Building2, IndianRupee, BadgeCheck,
} from "lucide-react"
import { toast } from "sonner"
import type { Appointment } from "@/types"
import type { MapMarker } from "@/components/Map"

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => <div className="w-full h-[400px] rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />,
})

interface Doctor {
  name: string
  specialization: string
  hospital: string
  address: string
  phone: string
  rating: number
  experience: string
  consultation_fee: string
  available_days: string
  lat: number
  lng: number
}

const COMMON_CONDITIONS = [
  "Fever & Cold",
  "Headache / Migraine",
  "Skin Problems",
  "Eye Problems",
  "Dental Issues",
  "Heart Problems",
  "Stomach / Digestive Issues",
  "Joint / Bone Pain",
  "Mental Health / Anxiety",
  "Diabetes",
  "Allergies",
  "ENT Problems",
  "Women's Health",
  "Child / Pediatric Care",
  "General Checkup",
]

export default function AppointmentsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [showForm, setShowForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Location state
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLng, setUserLng] = useState<number | null>(null)
  const [userCity, setUserCity] = useState("")
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationDetected, setLocationDetected] = useState(false)

  // Disease / search
  const [selectedDisease, setSelectedDisease] = useState("")
  const [customDisease, setCustomDisease] = useState("")
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [searching, setSearching] = useState(false)
  const [searchDone, setSearchDone] = useState(false)

  // Booking form
  const [form, setForm] = useState({
    doctor_name: "", doctor_specialization: "", doctor_address: "",
    doctor_phone: "", appointment_date: "", appointment_time: "", notes: ""
  })

  // Load existing appointments
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
      return
    }
    if (!user) return
    api.get<Appointment[]>("/appointments").then(setAppointments).catch(() => {})
  }, [user, loading, router])

  // Auto-detect location on mount
  useEffect(() => {
    detectLocation()
  }, [])

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser")
      return
    }

    setLocationLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        setUserLat(lat)
        setUserLng(lng)

        // Reverse geocode to get city name
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=12`
          )
          const data = await res.json()
          const city = data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.address?.county ||
            data.address?.state ||
            "your area"
          setUserCity(city)
        } catch {
          setUserCity("your area")
        }

        setLocationDetected(true)
        setLocationLoading(false)
        toast.success("Location detected!")
      },
      (error) => {
        setLocationLoading(false)
        toast.error("Could not detect location. Please allow location access.")
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  const handleSearchDoctors = async () => {
    const disease = selectedDisease || customDisease
    if (!disease) {
      toast.error("Please select or enter a health condition")
      return
    }
    if (!userLat || !userLng) {
      toast.error("Location not detected. Please allow location access.")
      return
    }

    setSearching(true)
    setSearchDone(false)
    try {
      const res = await api.post<{ doctors: Doctor[]; location: string; condition: string }>(
        "/appointments/search-doctors",
        {
          latitude: userLat,
          longitude: userLng,
          city: userCity,
          disease: disease,
        }
      )
      setDoctors(res.doctors)
      setSearchDone(true)
      if (res.doctors.length > 0) {
        toast.success(`Found ${res.doctors.length} doctors for "${disease}" near ${userCity}`)
      } else {
        toast.info("No doctors found. Try a different condition.")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to search doctors")
    } finally {
      setSearching(false)
    }
  }

  const mapMarkers: MapMarker[] = [
    // User location marker
    ...(userLat && userLng ? [{
      lat: userLat,
      lng: userLng,
      name: "📍 Your Location",
      address: userCity,
      description: "You are here",
    }] : []),
    // Doctor markers
    ...doctors.map(d => ({
      lat: d.lat,
      lng: d.lng,
      name: d.name,
      address: d.address,
      phone: d.phone,
      description: `${d.specialization} — ${d.hospital}`,
    })),
  ]

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const appt = await api.post<Appointment>("/appointments", form)
      setAppointments(prev => [appt, ...prev])
      setShowForm(false)
      setForm({ doctor_name: "", doctor_specialization: "", doctor_address: "", doctor_phone: "", appointment_date: "", appointment_time: "", notes: "" })
      toast.success("Appointment booked!")
    } catch (err: any) {
      toast.error(err.message || "Failed to book")
    }
  }

  const handleCancel = async (id: number) => {
    try {
      await api.put(`/appointments/${id}/cancel`)
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: "cancelled" } : a))
      toast.success("Appointment cancelled")
    } catch {
      toast.error("Failed to cancel")
    }
  }

  const fillDoctor = (d: Doctor) => {
    setForm({
      ...form,
      doctor_name: d.name,
      doctor_specialization: d.specialization,
      doctor_address: `${d.hospital}, ${d.address}`,
      doctor_phone: d.phone,
    })
    setShowForm(true)
    toast.success(`Selected ${d.name} — fill in your preferred date & time`)
  }

  return (
    <div className="min-h-[90vh] max-w-7xl mx-auto p-4 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold gradient-text">Appointments</h1>
          <p className="text-gray-500 mt-1">Find doctors near you & book appointments</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Book Appointment
        </Button>
      </div>

      {/* === Step 1: Location Detection === */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass p-5 md:p-6 rounded-2xl mb-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">
            <Locate className="w-5 h-5 text-primary-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Your Location</h2>
            {locationDetected ? (
              <p className="text-sm text-green-500 flex items-center gap-1">
                <BadgeCheck className="w-3.5 h-3.5" />
                Detected: <span className="font-medium">{userCity}</span>
              </p>
            ) : (
              <p className="text-sm text-gray-500">Detecting your location...</p>
            )}
          </div>
          {!locationDetected && (
            <Button
              variant="outline"
              size="sm"
              className="ml-auto gap-2"
              onClick={detectLocation}
              disabled={locationLoading}
            >
              {locationLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Locate className="w-3.5 h-3.5" />}
              Detect Location
            </Button>
          )}
        </div>

        {/* === Step 2: Disease Selection === */}
        {locationDetected && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.3 }}
          >
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
              <h3 className="text-sm font-semibold mb-3 text-gray-600 dark:text-gray-400">
                What health issue are you facing?
              </h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {COMMON_CONDITIONS.map((condition) => (
                  <button
                    key={condition}
                    onClick={() => { setSelectedDisease(condition); setCustomDisease("") }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                      selectedDisease === condition
                        ? "bg-primary-500 text-white shadow-lg shadow-primary-500/25"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    {condition}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Or type your condition / symptoms..."
                  value={customDisease}
                  onChange={(e) => { setCustomDisease(e.target.value); setSelectedDisease("") }}
                  className="flex-1"
                />
                <Button
                  onClick={handleSearchDoctors}
                  disabled={searching || (!selectedDisease && !customDisease)}
                  className="gap-2 min-w-[160px]"
                >
                  {searching ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Searching...</>
                  ) : (
                    <><Search className="w-4 h-4" /> Find Doctors</>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* === Step 3: AI Doctor Results === */}
      <AnimatePresence>
        {searchDone && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass p-4 md:p-6 rounded-2xl mb-6"
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-primary-500" />
              Recommended Doctors near {userCity}
              <span className="text-xs font-normal text-gray-500 ml-2">
                ({doctors.length} found for "{selectedDisease || customDisease}")
              </span>
            </h2>

            {/* Map */}
            <Map
              markers={mapMarkers}
              center={userLat && userLng ? [userLat, userLng] : undefined}
              zoom={13}
            />

            {/* Doctor Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mt-5">
              {doctors.map((d, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="glass p-4 rounded-xl cursor-pointer card-hover group"
                  onClick={() => fillDoctor(d)}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center shrink-0">
                      <Stethoscope className="w-5 h-5 text-primary-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate group-hover:text-primary-500 transition-colors">
                        {d.name}
                      </p>
                      <p className="text-xs text-primary-500 font-medium">{d.specialization}</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-500">
                    <p className="flex items-center gap-1.5">
                      <Building2 className="w-3 h-3 shrink-0 text-gray-400" />
                      <span className="truncate">{d.hospital}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 shrink-0 text-gray-400" />
                      <span className="truncate">{d.address}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3 shrink-0 text-gray-400" />
                      <span className="font-medium text-gray-700 dark:text-gray-300">{d.phone}</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                      <span className="text-xs font-semibold">{d.rating}</span>
                    </div>
                    <span className="text-xs text-gray-500">{d.experience}</span>
                    <span className="text-xs font-semibold text-primary-500">{d.consultation_fee}</span>
                  </div>

                  <div className="mt-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 font-medium">
                      {d.available_days}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === Booking Form === */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass p-6 rounded-2xl mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Book Appointment</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleBook} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input placeholder="Doctor Name" value={form.doctor_name} onChange={(e) => setForm({...form, doctor_name: e.target.value})} required />
              <Input placeholder="Specialization" value={form.doctor_specialization} onChange={(e) => setForm({...form, doctor_specialization: e.target.value})} required />
              <Input placeholder="Hospital / Address" value={form.doctor_address} onChange={(e) => setForm({...form, doctor_address: e.target.value})} />
              <Input placeholder="Phone" value={form.doctor_phone} onChange={(e) => setForm({...form, doctor_phone: e.target.value})} />
              <Input type="date" value={form.appointment_date} onChange={(e) => setForm({...form, appointment_date: e.target.value})} required />
              <Input type="time" value={form.appointment_time} onChange={(e) => setForm({...form, appointment_time: e.target.value})} required />
              <Input placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} className="md:col-span-2" />
              <Button type="submit" className="md:col-span-2">Confirm Booking</Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === Existing Appointments === */}
      {appointments.length > 0 && (
        <>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search your appointments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {appointments.filter(a => a.doctor_name.toLowerCase().includes(searchQuery.toLowerCase())).map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass p-5 rounded-xl card-hover"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">
                    <Stethoscope className="w-5 h-5 text-primary-500" />
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    a.status === "scheduled" ? "bg-green-500/20 text-green-500" :
                    a.status === "completed" ? "bg-blue-500/20 text-blue-500" :
                    "bg-red-500/20 text-red-500"
                  }`}>{a.status}</span>
                </div>
                <h3 className="font-semibold">{a.doctor_name}</h3>
                <p className="text-sm text-gray-500 mb-3">{a.doctor_specialization}</p>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <Calendar className="w-3 h-3" /> {a.appointment_date}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                  <Clock className="w-3 h-3" /> {a.appointment_time}
                </div>
                {a.status === "scheduled" && (
                  <Button variant="danger" size="sm" className="w-full" onClick={() => handleCancel(a.id)}>
                    Cancel
                  </Button>
                )}
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
