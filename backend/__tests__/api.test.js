const { describe, it } = require('node:test')
const assert = require('node:assert')

const API_BASE = 'http://localhost:3001'

describe('API integration (real Databricks, real server)', () => {
  it('GET /health returns ok', async () => {
    const res = await fetch(`${API_BASE}/health`)
    assert.strictEqual(res.status, 200)
    const data = await res.json()
    assert.strictEqual(data?.ok, true)
    console.log('GET /health ->', data)
  })

  it('GET /api/me connects to Databricks and returns user (SCIM Me)', async () => {
    const res = await fetch(`${API_BASE}/api/me`)
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`)
    const data = await res.json()
    assert.ok(data && typeof data === 'object', 'response body exists')
    const hasIdentity =
      data.userName ||
      data.id ||
      (Array.isArray(data.emails) && data.emails.length > 0) ||
      data.displayName
    assert.ok(hasIdentity, 'user identity present (userName, id, emails, or displayName)')
    console.log('GET /api/me ->', JSON.stringify(data, null, 2))
  })

  it('GET /api/catalogs returns catalog list', async () => {
    const res = await fetch(`${API_BASE}/api/catalogs`)
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`)
    const data = await res.json()
    assert.ok(Array.isArray(data?.catalogs), 'catalogs array present')
    const catalogs = data?.catalogs ?? []
    console.log('GET /api/catalogs ->', catalogs.length, 'catalogs', catalogs.map((c) => c.name).slice(0, 10))
  })

  it('GET /api/projects returns project list', async () => {
    const res = await fetch(`${API_BASE}/api/projects`)
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`)
    const data = await res.json()
    assert.ok(Array.isArray(data?.projects), 'projects array present')
    const projects = data?.projects ?? []
    console.log('GET /api/projects ->', projects.length, 'projects', projects.map((p) => p.name))
  })
})
