"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { motion, AnimatePresence } from "framer-motion"
import {
  Pill, Plus, Scan, Trash2, Upload, Loader2, Clock, AlertTriangle,
  CheckCircle2, Sparkles, X, FileText, Camera, ChevronRight, Heart,
} from "lucide-react"
import { toast } from "sonner"
import type { Medicine } from "@/types"

interface AIMedicine {
  name: string
  dosage: string
  frequency: string
  time_of_day: string
  duration: string
  notes: string
  type?: string
  purpose?: string
  selected?: boolean
  stock_count?: number
}

interface AIRecommendation {
  condition_summary: string
  severity: string
  see_doctor: boolean
  disclaimer: string
  medicines: AIMedicine[]
}

export default function MedicinesPage() {
  const { user } = useAuth()
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: "", dosage: "", frequency: "", time_of_day: "",
    start_date: "", end_date: "", stock_count: 0, notes: ""
  })

  // AI Flow states
  const [showAIFlow, setShowAIFlow] = useState(false)
  const [aiStep, setAiStep] = useState<"upload" | "describe" | "results">("upload")
  const [scanning, setScanning] = useState(false)
  const [ocrText, setOcrText] = useState("")
  const [aiAnalysis, setAiAnalysis] = useState("")
  const [extractedMeds, setExtractedMeds] = useState<AIMedicine[]>([])
  const [prescriptionImageUrl, setPrescriptionImageUrl] = useState("")
  const [showImagePreview, setShowImagePreview] = useState(false)
  const [diseaseInput, setDiseaseInput] = useState("")
  const [recommending, setRecommending] = useState(false)
  const [recommendation, setRecommendation] = useState<AIRecommendation | null>(null)
  const [addingMeds, setAddingMeds] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) return
    api.get<Medicine[]>("/medicines").then(setMedicines).catch(() => {})
  }, [user])

  // === Step 1: Scan Prescription ===
  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setScanning(true)
    setShowAIFlow(true)
    setAiStep("upload")

    try {
      const res = await api.upload<{
        ocr_text: string
        ai_analysis: string
        extracted_medicines: AIMedicine[]
        image_url: string
      }>("/medicines/scan-prescription", file)

      // Store prescription image URL (served from backend)
      const envUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      const backendBase = envUrl.replace(/\/api\/v1\/?$/, "").replace(/\/+$/, "")
      setPrescriptionImageUrl(`${backendBase}${res.image_url}`)

      setOcrText(res.ocr_text)
      setAiAnalysis(res.ai_analysis)

      if (res.extracted_medicines && res.extracted_medicines.length > 0) {
        setExtractedMeds(res.extracted_medicines.map(m => ({ ...m, selected: true })))
        toast.success(`Found ${res.extracted_medicines.length} medicines in prescription!`)
      } else {
        toast.info("No medicines found in scan. Describe your condition for AI suggestions.")
      }

      setAiStep("describe")
    } catch (err: any) {
      toast.error(err.message || "Scan failed")
    } finally {
      setScanning(false)
    }
  }

  // === Step 2: Describe Disease & Get AI Recommendations ===
  const handleAIRecommend = async () => {
    if (!diseaseInput.trim()) {
      toast.error("Please describe your condition")
      return
    }

    setRecommending(true)
    try {
      const res = await api.post<AIRecommendation>("/medicines/ai-recommend", {
        disease_description: diseaseInput,
      })

      setRecommendation(res)
      setExtractedMeds(
        res.medicines.map(m => ({ ...m, selected: true }))
      )
      setAiStep("results")
      toast.success(`AI suggests ${res.medicines.length} medicines`)
    } catch (err: any) {
      toast.error(err.message || "AI recommendation failed")
    } finally {
      setRecommending(false)
    }
  }

  // === Step 3: Add Selected Medicines ===
  const handleAddSelected = async () => {
    const selected = extractedMeds.filter(m => m.selected)
    if (selected.length === 0) {
      toast.error("No medicines selected")
      return
    }

    setAddingMeds(true)
    try {
      const medsToAdd = selected.map(m => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        time_of_day: m.time_of_day || "",
        stock_count: m.stock_count || 0,
        notes: [m.notes, m.purpose, m.duration ? `Duration: ${m.duration}` : ""]
          .filter(Boolean).join(". "),
      }))

      await api.post("/medicines/bulk-add", medsToAdd)

      // Refresh medicines list
      const updated = await api.get<Medicine[]>("/medicines")
      setMedicines(updated)

      toast.success(`${selected.length} medicines added successfully!`)
      resetAIFlow()
    } catch (err: any) {
      toast.error(err.message || "Failed to add medicines")
    } finally {
      setAddingMeds(false)
    }
  }

  const toggleMedSelection = (index: number) => {
    setExtractedMeds(prev =>
      prev.map((m, i) => i === index ? { ...m, selected: !m.selected } : m)
    )
  }

  const updateMedStock = (index: number, stock: number) => {
    setExtractedMeds(prev =>
      prev.map((m, i) => i === index ? { ...m, stock_count: stock } : m)
    )
  }

  const resetAIFlow = () => {
    setShowAIFlow(false)
    setAiStep("upload")
    setOcrText("")
    setAiAnalysis("")
    setExtractedMeds([])
    setDiseaseInput("")
    setRecommendation(null)
    setPrescriptionImageUrl("")
    setShowImagePreview(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const med = await api.post<Medicine>("/medicines", form)
      setMedicines(prev => [med, ...prev])
      setShowForm(false)
      setForm({ name: "", dosage: "", frequency: "", time_of_day: "", start_date: "", end_date: "", stock_count: 0, notes: "" })
      toast.success("Medicine added!")
    } catch (err: any) {
      toast.error(err.message || "Failed to add")
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/medicines/${id}`)
      setMedicines(prev => prev.filter(m => m.id !== id))
      toast.success("Medicine removed")
    } catch {
      toast.error("Failed to delete")
    }
  }

  const startAIFlow = () => {
    setShowAIFlow(true)
    setAiStep("describe")
  }

  return (
    <div className="min-h-[90vh] max-w-7xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold gradient-text">Medicines</h1>
          <p className="text-gray-500 mt-1">Track & manage your medications</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <label className="cursor-pointer">
            <Button variant="outline" className="gap-2" asChild>
              <span><Scan className="w-4 h-4" /> Scan Prescription</span>
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleScan}
              className="hidden"
            />
          </label>
          <Button variant="secondary" className="gap-2" onClick={startAIFlow}>
            <Sparkles className="w-4 h-4" /> AI Suggest
          </Button>
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Add Manually
          </Button>
        </div>
      </div>

      {/* === AI Flow Panel === */}
      <AnimatePresence>
        {showAIFlow && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass p-6 rounded-2xl mb-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">AI Medicine Assistant</h2>
                  <p className="text-xs text-gray-500">
                    {aiStep === "upload" && "Scanning your prescription..."}
                    {aiStep === "describe" && "Describe your condition for AI suggestions"}
                    {aiStep === "results" && "Review & add recommended medicines"}
                  </p>
                </div>
              </div>
              <button onClick={resetAIFlow}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center gap-2 mb-6">
              {["Scan / Upload", "Describe Condition", "Review Medicines"].map((step, i) => (
                <div key={step} className="flex items-center gap-2 flex-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    (i === 0 && aiStep === "upload") || (i === 1 && aiStep === "describe") || (i === 2 && aiStep === "results")
                      ? "bg-primary-500 text-white"
                      : i < ["upload", "describe", "results"].indexOf(aiStep)
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-500"
                  }`}>
                    {i < ["upload", "describe", "results"].indexOf(aiStep) ? "✓" : i + 1}
                  </div>
                  <span className="text-xs text-gray-500 hidden sm:inline">{step}</span>
                  {i < 2 && <ChevronRight className="w-3 h-3 text-gray-400 shrink-0" />}
                </div>
              ))}
            </div>

            {/* Step: Scanning */}
            {aiStep === "upload" && scanning && (
              <div className="text-center py-10">
                <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
                <p className="text-gray-500">Scanning prescription with AI...</p>
                <p className="text-xs text-gray-400 mt-1">Extracting text and analyzing medicines</p>
              </div>
            )}

            {/* Step: Describe Disease */}
            {aiStep === "describe" && (
              <div>
                {/* Prescription Image Preview */}
                {prescriptionImageUrl && (
                  <div className="mb-4">
                    <button
                      onClick={() => setShowImagePreview(!showImagePreview)}
                      className="flex items-center gap-2 text-sm font-medium text-primary-500 hover:underline mb-2"
                    >
                      <Camera className="w-4 h-4" />
                      {showImagePreview ? "Hide" : "View"} Prescription Image
                    </button>
                    {showImagePreview && (
                      <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 mb-3">
                        <img
                          src={prescriptionImageUrl}
                          alt="Scanned Prescription"
                          className="w-full max-h-[400px] object-contain bg-white"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Show OCR results if available */}
                {ocrText && (
                  <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-xs font-medium text-blue-500 mb-1 flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Text Read from Prescription
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap max-h-32 overflow-y-auto">
                      {ocrText}
                    </p>
                  </div>
                )}

                {aiAnalysis && (
                  <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-xs font-medium text-green-500 mb-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> AI Analysis
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{aiAnalysis}</p>
                  </div>
                )}

                {/* Extracted medicines from scan */}
                {extractedMeds.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2">Medicines found in prescription:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {extractedMeds.map((m, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                          <span className="font-medium">{m.name}</span>
                          <span className="text-gray-500 text-xs">- {m.dosage} {m.frequency}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <label className="text-sm font-medium mb-2 block">
                    Describe your disease / symptoms for AI medicine suggestions:
                  </label>
                  <textarea
                    value={diseaseInput}
                    onChange={(e) => setDiseaseInput(e.target.value)}
                    placeholder="e.g., I have severe headache with fever since 2 days, mild body pain and sore throat..."
                    className="w-full h-28 p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-transparent text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  />
                  <div className="flex gap-2 mt-3">
                    <Button
                      onClick={handleAIRecommend}
                      disabled={recommending || !diseaseInput.trim()}
                      className="gap-2 flex-1"
                    >
                      {recommending ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
                      ) : (
                        <><Sparkles className="w-4 h-4" /> Get AI Medicine Suggestions</>
                      )}
                    </Button>
                    {extractedMeds.length > 0 && (
                      <Button
                        variant="secondary"
                        onClick={() => setAiStep("results")}
                        className="gap-2"
                      >
                        Skip → Use Scanned <ChevronRight className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step: Results */}
            {aiStep === "results" && (
              <div>
                {recommendation && (
                  <>
                    <div className={`mb-4 p-3 rounded-lg border ${
                      recommendation.severity === "severe"
                        ? "bg-red-500/10 border-red-500/20"
                        : recommendation.severity === "moderate"
                          ? "bg-yellow-500/10 border-yellow-500/20"
                          : "bg-green-500/10 border-green-500/20"
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Heart className={`w-4 h-4 ${
                          recommendation.severity === "severe" ? "text-red-500" :
                          recommendation.severity === "moderate" ? "text-yellow-500" : "text-green-500"
                        }`} />
                        <span className="text-sm font-semibold capitalize">{recommendation.severity} condition</span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{recommendation.condition_summary}</p>
                    </div>

                    {recommendation.see_doctor && (
                      <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-600 dark:text-red-400">
                          <strong>Doctor Visit Recommended:</strong> {recommendation.disclaimer}
                        </p>
                      </div>
                    )}
                  </>
                )}

                <p className="text-sm font-medium mb-3">
                  Select medicines to add ({extractedMeds.filter(m => m.selected).length} selected):
                </p>

                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {extractedMeds.map((m, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => toggleMedSelection(i)}
                      className={`p-4 rounded-xl border transition-all duration-200 ${
                        m.selected
                          ? "border-primary-500/50 bg-primary-500/5 shadow-sm"
                          : "border-gray-200 dark:border-gray-700 opacity-60"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div 
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 cursor-pointer ${
                            m.selected ? "bg-primary-500 border-primary-500" : "border-gray-300 dark:border-gray-600"
                          }`}
                          onClick={() => toggleMedSelection(i)}
                        >
                          {m.selected && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap cursor-pointer" onClick={() => toggleMedSelection(i)}>
                            <h4 className="font-semibold text-sm">{m.name}</h4>
                            {m.type && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-500/10 text-accent-500 font-medium uppercase">
                                {m.type}
                              </span>
                            )}
                          </div>
                          {m.purpose && (
                            <p className="text-xs text-primary-500 mt-0.5 cursor-pointer" onClick={() => toggleMedSelection(i)}>{m.purpose}</p>
                          )}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 cursor-pointer" onClick={() => toggleMedSelection(i)}>
                            <div className="text-xs">
                              <span className="text-gray-400 block">Dosage</span>
                              <span className="font-medium">{m.dosage}</span>
                            </div>
                            <div className="text-xs">
                              <span className="text-gray-400 block">Frequency</span>
                              <span className="font-medium">{m.frequency}</span>
                            </div>
                            <div className="text-xs">
                              <span className="text-gray-400 block">Timing</span>
                              <span className="font-medium flex items-center gap-1">
                                <Clock className="w-3 h-3 text-gray-400" />
                                {m.time_of_day || "Any time"}
                              </span>
                            </div>
                            <div className="text-xs">
                              <span className="text-gray-400 block">Duration</span>
                              <span className="font-medium">{m.duration || "As needed"}</span>
                            </div>
                          </div>
                          {m.notes && (
                            <p className="text-xs text-gray-500 mt-2 italic cursor-pointer" onClick={() => toggleMedSelection(i)}>💊 {m.notes}</p>
                          )}
                          
                          {m.selected && (
                            <div 
                              className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700/50 flex items-center gap-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Stock Count (Amount Bought):</label>
                              <Input 
                                type="number" 
                                min="0"
                                className="h-8 w-24 text-sm" 
                                value={m.stock_count || ""} 
                                onChange={(e) => updateMedStock(i, parseInt(e.target.value) || 0)}
                                placeholder="0"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="flex gap-2 mt-5">
                  <Button variant="ghost" onClick={() => setAiStep("describe")} className="gap-1">
                    ← Back
                  </Button>
                  <Button
                    onClick={handleAddSelected}
                    disabled={addingMeds || extractedMeds.filter(m => m.selected).length === 0}
                    className="gap-2 flex-1"
                  >
                    {addingMeds ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</>
                    ) : (
                      <><Plus className="w-4 h-4" /> Add {extractedMeds.filter(m => m.selected).length} Medicines</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* === Manual Add Form === */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass p-6 rounded-2xl mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Add Medicine Manually</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddManual} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input placeholder="Medicine Name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
              <Input placeholder="Dosage (e.g. 500mg)" value={form.dosage} onChange={(e) => setForm({...form, dosage: e.target.value})} required />
              <Input placeholder="Frequency (e.g. Twice daily)" value={form.frequency} onChange={(e) => setForm({...form, frequency: e.target.value})} required />
              <Input placeholder="Time (e.g. Morning 8AM, Night 9PM)" value={form.time_of_day} onChange={(e) => setForm({...form, time_of_day: e.target.value})} />
              <Input type="date" placeholder="Start Date" value={form.start_date} onChange={(e) => setForm({...form, start_date: e.target.value})} />
              <Input type="date" placeholder="End Date" value={form.end_date} onChange={(e) => setForm({...form, end_date: e.target.value})} />
              <Input type="number" placeholder="Stock Count" value={form.stock_count || ""} onChange={(e) => setForm({...form, stock_count: parseInt(e.target.value) || 0})} />
              <Input placeholder="Notes" value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} />
              <Button type="submit" className="md:col-span-2">Save Medicine</Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === Medicine Cards === */}
      {medicines.length === 0 && !showAIFlow && !showForm && (
        <div className="text-center py-16">
          <Pill className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500 mb-2">No medicines added yet</h3>
          <p className="text-sm text-gray-400 mb-4">Scan a prescription or use AI to get started</p>
          <div className="flex gap-2 justify-center">
            <label className="cursor-pointer">
              <Button variant="outline" className="gap-2" asChild>
                <span><Scan className="w-4 h-4" /> Scan Prescription</span>
              </Button>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleScan}
                className="hidden"
              />
            </label>
            <Button onClick={startAIFlow} className="gap-2">
              <Sparkles className="w-4 h-4" /> AI Suggest
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {medicines.map((m, i) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass p-5 rounded-xl card-hover"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-full bg-accent-500/20 flex items-center justify-center">
                <Pill className="w-5 h-5 text-accent-500" />
              </div>
              <button onClick={() => handleDelete(m.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <h3 className="font-semibold">{m.name}</h3>
            <p className="text-sm text-gray-500">{m.dosage} — {m.frequency}</p>
            {m.time_of_day && (
              <p className="text-xs text-primary-500 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {m.time_of_day}
              </p>
            )}
            {m.notes && (
              <p className="text-xs text-gray-400 mt-1 italic">{m.notes}</p>
            )}
            <div className="flex items-center justify-between mt-3 text-xs text-gray-500 pt-3 border-t border-gray-200 dark:border-gray-700">
              <span>Stock: {m.stock_count ?? 0}</span>
              {m.stock_count !== null && m.stock_count <= (m.stock_refill_threshold || 5) && (
                <span className="text-red-500 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Refill needed
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
