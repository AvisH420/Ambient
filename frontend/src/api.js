// API base. In dev this defaults to localhost:8000 (your FastAPI backend).
// In production on Vercel, set VITE_API_URL to your deployed Render URL.
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function json(path) {
  const r = await fetch(`${BASE}${path}`)
  if (!r.ok) throw new Error(`${path}: ${r.status}`)
  return r.json()
}

export const getReadings  = (limit = 200) => json(`/readings?limit=${limit}`)
export const getStats     = (hours = 1)   => json(`/stats?hours=${hours}`)
export const getAnomalies = (limit = 20)  => json(`/anomalies?limit=${limit}`)
