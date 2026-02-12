import { describe, it, expect } from 'vitest'

const API_BASE = 'http://localhost:3001'

describe('API integration (real backend)', () => {
  it('GET /health returns ok', async () => {
    const res = await fetch(`${API_BASE}/health`)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data?.ok).toBe(true)
    console.log('GET /health ->', data)
  })

  it('GET /api/me returns user (SCIM Me)', async () => {
    const res = await fetch(`${API_BASE}/api/me`)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toBeTruthy()
    const hasIdentity =
      data.userName ||
      data.id ||
      (Array.isArray(data.emails) && data.emails.length > 0) ||
      data.displayName
    expect(!!hasIdentity).toBe(true)
    console.log('GET /api/me ->', JSON.stringify(data, null, 2))
  })

  it('GET /api/catalogs returns catalog list', { timeout: 15000 }, async () => {
    const res = await fetch(`${API_BASE}/api/catalogs`)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data?.catalogs)).toBe(true)
    const catalogs = data?.catalogs ?? []
    console.log('GET /api/catalogs ->', catalogs.length, 'catalogs', catalogs.map((c: { name: string }) => c.name).slice(0, 10))
  })

  it('GET /api/projects returns project list', async () => {
    const res = await fetch(`${API_BASE}/api/projects`)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data?.projects)).toBe(true)
    const projects = data?.projects ?? []
    console.log('GET /api/projects ->', projects.length, 'projects', projects.map((p: { name: string }) => p.name))
  })
})
