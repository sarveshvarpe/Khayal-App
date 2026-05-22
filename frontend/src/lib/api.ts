// Centralized API base helper
const getApiBase = () => {
  let url = process.env.NEXT_PUBLIC_API_URL || "https://khayal-app-production.up.railway.app"
  
  // If running on Vercel in the browser, forcefully ignore localhost and use production Railway
  if (typeof window !== "undefined" && window.location.hostname.includes("vercel.app")) {
    url = "https://khayal-app-production.up.railway.app"
  } else {
    // Force HTTPS in production to prevent mixed-content blocked errors
    if (url.startsWith("http://") && !url.includes("localhost") && !url.includes("127.0.0.1")) {
      url = url.replace("http://", "https://")
    }
    
    // If the user entered just the domain without protocol
    if (!url.startsWith("http")) {
      url = "https://" + url
    }
  }

  // Remove trailing slashes and any existing /api/v1 to avoid duplication
  const cleanUrl = url.replace(/\/+$/, "").replace(/\/api\/v1$/, "")
  return `${cleanUrl}/api/v1`
}

const API_BASE = getApiBase()

class ApiClient {
  private baseUrl: string

  constructor() {
    this.baseUrl = API_BASE
  }

  private getToken(): string | null {
    if (typeof window === "undefined") return null
    return localStorage.getItem("access_token")
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = { "Content-Type": "application/json" }
    const token = this.getToken()
    if (token) headers["Authorization"] = `Bearer ${token}`
    return headers
  }

  private async refreshTokenIfNeeded(): Promise<void> {
    const token = this.getToken()
    if (!token) return

    // Decode JWT to check expiry (JWT payload is base64url encoded)
    try {
      const payload = JSON.parse(atob(token.split(".")[1]))
      const exp = payload.exp * 1000 // convert to ms
      const now = Date.now()
      const fiveMinutes = 5 * 60 * 1000

      // Refresh if token expires within 5 minutes
      if (exp - now < fiveMinutes) {
        const refreshToken = localStorage.getItem("refresh_token")
        if (!refreshToken) return

        const res = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        })

        if (res.ok) {
          const data = await res.json()
          localStorage.setItem("access_token", data.access_token)
          localStorage.setItem("refresh_token", data.refresh_token)
        } else {
          // Refresh failed — clear tokens
          localStorage.removeItem("access_token")
          localStorage.removeItem("refresh_token")
        }
      }
    } catch {
      // Token parsing failed, ignore
    }
  }

  private async handleResponse<T>(res: Response, path: string, method: string): Promise<T> {
    if (res.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token")
        localStorage.removeItem("refresh_token")
        window.location.href = "/login"
      }
      throw new Error("Session expired. Please log in again.")
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Request failed" }))
      throw new Error(err.detail || `${method} ${path} failed: ${res.status}`)
    }
    return res.json()
  }

  async get<T>(path: string): Promise<T> {
    await this.refreshTokenIfNeeded()
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: this.getHeaders(),
    })
    return this.handleResponse<T>(res, path, "GET")
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    await this.refreshTokenIfNeeded()
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    })
    return this.handleResponse<T>(res, path, "POST")
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    await this.refreshTokenIfNeeded()
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    })
    return this.handleResponse<T>(res, path, "PUT")
  }

  async delete<T>(path: string): Promise<T> {
    await this.refreshTokenIfNeeded()
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    })
    return this.handleResponse<T>(res, path, "DELETE")
  }

  async upload<T>(path: string, file: File): Promise<T> {
    await this.refreshTokenIfNeeded()
    const formData = new FormData()
    formData.append("file", file)
    const headers: HeadersInit = {}
    const token = this.getToken()
    if (token) headers["Authorization"] = `Bearer ${token}`
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers,
      body: formData,
    })
    return this.handleResponse<T>(res, path, "UPLOAD")
  }
}

export const api = new ApiClient()
