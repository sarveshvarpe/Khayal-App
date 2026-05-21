const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

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

  async get<T>(path: string): Promise<T> {
    await this.refreshTokenIfNeeded()
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: this.getHeaders(),
    })
    if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`)
    return res.json()
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    await this.refreshTokenIfNeeded()
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Request failed" }))
      throw new Error(err.detail || `POST ${path} failed: ${res.status}`)
    }
    return res.json()
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    await this.refreshTokenIfNeeded()
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status}`)
    return res.json()
  }

  async delete<T>(path: string): Promise<T> {
    await this.refreshTokenIfNeeded()
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    })
    if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`)
    return res.json()
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
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Upload failed" }))
      throw new Error(err.detail || `UPLOAD ${path} failed: ${res.status}`)
    }
    return res.json()
  }
}

export const api = new ApiClient()
