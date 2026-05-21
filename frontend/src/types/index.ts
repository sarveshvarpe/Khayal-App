export interface User {
  id: number
  full_name: string
  email: string
  age: number | null
  role: string
  is_verified: boolean
  is_active: boolean
  profile_photo: string | null
  phone: string | null
  address: string | null
  created_at: string
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  token_type: string
  user: User
}

export interface Appointment {
  id: number
  doctor_name: string
  doctor_specialization: string
  appointment_date: string
  appointment_time: string
  status: string
  notes: string | null
  rating: number | null
  created_at: string
}

export interface Medicine {
  id: number
  name: string
  dosage: string
  frequency: string
  time_of_day: string | null
  start_date: string | null
  end_date: string | null
  stock_count: number | null
  stock_refill_threshold: number | null
  is_active: boolean
  notes: string | null
  created_at: string
}

export interface FitnessProgress {
  id: number
  weight: number | null
  height: number | null
  steps: number
  calories: number
  water_intake: number
  sleep_hours: number
  date: string
}

export interface LabTest {
  id: number
  lab_name: string
  lab_address: string | null
  lab_phone: string | null
  test_type: string
  appointment_date: string | null
  appointment_time: string | null
  status: string
  report_url: string | null
  notes: string | null
  created_at: string
}

export interface ChatMessage {
  id: number
  role: string
  content: string
  created_at: string
}
