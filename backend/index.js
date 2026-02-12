const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const express = require('express')
const { get, post, put, putBinary } = require('./lib/databricks-client.js')
const app = express()
const PORT = process.env.PORT || 3001

app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ ok: true })
})

app.get('/api/me', async (req, res) => {
  if (process.env.DEBUG) console.log('[backend] GET /api/me')
  try {
    const data = await get('/api/2.0/preview/scim/v2/Me')
    res.json(data)
  } catch (err) {
    if (process.env.DEBUG) console.log('[backend] /api/me error:', err.message)
    const status = err.status || 500
    res.status(status).json({ error: err.message })
  }
})

app.get('/api/catalogs', async (req, res) => {
  if (process.env.DEBUG) console.log('[backend] GET /api/catalogs')
  try {
    const data = await get('/api/2.1/unity-catalog/catalogs')
    res.json(data)
  } catch (err) {
    if (process.env.DEBUG) console.log('[backend] /api/catalogs error:', err.message)
    const status = err.status || 500
    res.status(status).json({ error: err.message })
  }
})

app.get('/api/schemas', async (req, res) => {
  const catalogName = req.query.catalog
  if (!catalogName || typeof catalogName !== 'string') {
    return res.status(400).json({ error: 'Query parameter "catalog" is required' })
  }
  if (process.env.DEBUG) console.log('[backend] GET /api/schemas catalog=', catalogName)
  try {
    const data = await get(`/api/2.1/unity-catalog/schemas?catalog_name=${encodeURIComponent(catalogName)}`)
    res.json(data)
  } catch (err) {
    if (process.env.DEBUG) console.log('[backend] /api/schemas error:', err.message)
    const status = err.status || 500
    res.status(status).json({ error: err.message })
  }
})

const ENV_LOCAL_PATH = path.join(__dirname, '..', '.env.local')
const UC_SCHEMA_KEY = 'AGENT_BUILDER_UC_SCHEMA'
const PROJECTS_VOLUME = 'projects'

function readUcSchemaFromEnvFile() {
  let value = null
  try {
    if (fs.existsSync(ENV_LOCAL_PATH)) {
      const content = fs.readFileSync(ENV_LOCAL_PATH, 'utf8')
      const m = content.match(new RegExp(`^\\s*${UC_SCHEMA_KEY}\\s*=\\s*(.+)$`, 'm'))
      if (m) value = m[1].trim()
    }
  } catch {}
  return value
}

app.get('/api/settings/unity-catalog-schema', (req, res) => {
  res.json({ value: readUcSchemaFromEnvFile() })
})

function parseCatalogSchema(value) {
  if (!value || typeof value !== 'string') return null
  const v = value.trim()
  const i = v.indexOf('.')
  if (i <= 0 || i >= v.length - 1) return null
  return { catalog: v.slice(0, i), schema: v.slice(i + 1) }
}

async function ensureProjectsVolumeExists(catalog, schema) {
  const listUrl = `/api/2.1/unity-catalog/volumes?catalog_name=${encodeURIComponent(catalog)}&schema_name=${encodeURIComponent(schema)}`
  let data
  try {
    data = await get(listUrl)
  } catch (err) {
    if (err.status === 404 || err.status === 400) {
      try {
        await post('/api/2.1/unity-catalog/volumes', {
          catalog_name: catalog,
          schema_name: schema,
          name: PROJECTS_VOLUME,
        })
        return
      } catch (createErr) {
        if (createErr.body && /already exists|RESOURCE_ALREADY_EXISTS/i.test(createErr.body)) return
        throw createErr
      }
    }
    throw err
  }
  const volumes = Array.isArray(data.volumes) ? data.volumes : Array.isArray(data) ? data : []
  const hasProjects = volumes.some((v) => v && (v.name || v.volume_name) === PROJECTS_VOLUME)
  if (hasProjects) return
  try {
    await post('/api/2.1/unity-catalog/volumes', {
      catalog_name: catalog,
      schema_name: schema,
      name: PROJECTS_VOLUME,
    })
  } catch (err) {
    if (err.body && /already exists|RESOURCE_ALREADY_EXISTS/i.test(err.body)) return
    throw err
  }
}

async function ensureDirectoryExists(directoryPath) {
  const pathForUrl = directoryPath.startsWith('/') ? directoryPath.slice(1) : directoryPath
  const pathEnc = encodeURIComponent(pathForUrl).replace(/%2F/g, '/')
  try {
    await put(`/api/2.0/fs/directories/${pathEnc}`)
  } catch (err) {
    if (err.status === 409 || err.status === 404 || (err.body && /already exists|exists/i.test(err.body))) return
    throw err
  }
}

app.get('/api/projects', async (req, res) => {
  const ucSchema = readUcSchemaFromEnvFile()
  const parsed = parseCatalogSchema(ucSchema)
  if (!parsed) {
    return res.json({ projects: [] })
  }
  const projectsDir = `/Volumes/${parsed.catalog}/${parsed.schema}/${PROJECTS_VOLUME}`
  const pathForUrl = projectsDir.startsWith('/') ? projectsDir.slice(1) : projectsDir
  const pathEnc = encodeURIComponent(pathForUrl).replace(/%2F/g, '/')
  try {
    const data = await get(`/api/2.0/fs/directories/${pathEnc}`)
    const contents = data.contents || []
    const projects = contents
      .filter((e) => e && e.name && e.name.endsWith('.proj.yaml'))
      .map((e) => ({ name: e.name.replace(/\.proj\.yaml$/, '') }))
    return res.json({ projects })
  } catch (err) {
    if (err.status === 404) return res.json({ projects: [] })
    if (process.env.DEBUG) console.log('[backend] GET /api/projects list error:', err.message)
    const status = err.status || 500
    return res.status(status).json({ error: err.message || 'Failed to list projects' })
  }
})

function slugFromName(name) {
  if (!name || typeof name !== 'string') return null
  const slug = name.trim().toLowerCase()
  if (!/^[a-z0-9-]+$/.test(slug) || slug.startsWith('-') || slug.endsWith('-')) return null
  return slug
}

app.get('/api/projects/:name', async (req, res) => {
  const slug = slugFromName(req.params.name)
  if (!slug) return res.status(400).json({ error: 'Invalid project name' })
  const ucSchema = readUcSchemaFromEnvFile()
  const parsed = parseCatalogSchema(ucSchema)
  if (!parsed) return res.status(400).json({ error: 'Unity Catalog schema not set. Configure it in Settings.' })
  const filePath = `/Volumes/${parsed.catalog}/${parsed.schema}/${PROJECTS_VOLUME}/${slug}.proj.yaml`
  const pathForUrl = filePath.startsWith('/') ? filePath.slice(1) : filePath
  const pathEnc = encodeURIComponent(pathForUrl).replace(/%2F/g, '/')
  try {
    const content = await get(`/api/2.0/fs/files/${pathEnc}`)
    const raw = typeof content === 'string' ? content : ''
    let data = { name: slug, nodes: [], edges: [] }
    if (raw.trim()) {
      try {
        const parsedYaml = yaml.load(raw)
        if (parsedYaml && typeof parsedYaml === 'object') {
          data.name = parsedYaml.name ?? slug
          data.nodes = Array.isArray(parsedYaml.nodes) ? parsedYaml.nodes : []
          data.edges = Array.isArray(parsedYaml.edges) ? parsedYaml.edges : []
        }
      } catch (_) {}
    }
    return res.json(data)
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ error: 'Project not found' })
    if (process.env.DEBUG) console.log('[backend] GET /api/projects/:name error:', err.message)
    return res.status(err.status || 500).json({ error: err.message || 'Failed to load project' })
  }
})

app.put('/api/projects/:name', async (req, res) => {
  const slug = slugFromName(req.params.name)
  if (!slug) return res.status(400).json({ error: 'Invalid project name' })
  const { nodes = [], edges = [] } = req.body || {}
  const ucSchema = readUcSchemaFromEnvFile()
  const parsed = parseCatalogSchema(ucSchema)
  if (!parsed) return res.status(400).json({ error: 'Unity Catalog schema not set. Configure it in Settings.' })
  const filePath = `/Volumes/${parsed.catalog}/${parsed.schema}/${PROJECTS_VOLUME}/${slug}.proj.yaml`
  const pathForUrl = filePath.startsWith('/') ? filePath.slice(1) : filePath
  const pathEnc = encodeURIComponent(pathForUrl).replace(/%2F/g, '/')
  const payload = { name: slug, nodes: Array.isArray(nodes) ? nodes : [], edges: Array.isArray(edges) ? edges : [] }
  const yamlContent = yaml.dump(payload, { lineWidth: -1 })
  try {
    await putBinary(`/api/2.0/fs/files/${pathEnc}`, yamlContent)
    return res.json({ ok: true, name: slug })
  } catch (err) {
    if (process.env.DEBUG) console.log('[backend] PUT /api/projects/:name error:', err.message)
    return res.status(err.status || 500).json({ error: err.message || 'Failed to save project' })
  }
})

app.post('/api/projects', async (req, res) => {
  const { name } = req.body || {}
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Body must include "name" (string)' })
  }
  const slug = name.trim().toLowerCase()
  if (!/^[a-z0-9-]+$/.test(slug) || slug.startsWith('-') || slug.endsWith('-')) {
    return res.status(400).json({ error: 'Name must be a slug: letters, numbers, hyphens only' })
  }
  const ucSchema = readUcSchemaFromEnvFile()
  const parsed = parseCatalogSchema(ucSchema)
  if (!parsed) {
    return res.status(400).json({ error: 'Unity Catalog schema not set. Configure it in Settings.' })
  }
  try {
    await ensureProjectsVolumeExists(parsed.catalog, parsed.schema)
  } catch (err) {
    if (process.env.DEBUG) console.log('[backend] ensure volume error:', err.message)
    const status = err.status || 500
    return res.status(status).json({ error: err.message || 'Failed to ensure projects volume' })
  }
  const projectsDir = `/Volumes/${parsed.catalog}/${parsed.schema}/${PROJECTS_VOLUME}`
  try {
    await ensureDirectoryExists(projectsDir)
  } catch (err) {
    if (process.env.DEBUG) console.log('[backend] ensure directory error:', err.message)
    const status = err.status || 500
    return res.status(status).json({ error: err.message || 'Failed to ensure projects directory' })
  }
  const volumePath = `${projectsDir}/${slug}.proj.yaml`
  const yamlContent = `name: ${slug}\n`
  const filePathForUrl = volumePath.startsWith('/') ? volumePath.slice(1) : volumePath
  const filesPathEnc = encodeURIComponent(filePathForUrl).replace(/%2F/g, '/')
  try {
    await putBinary(`/api/2.0/fs/files/${filesPathEnc}`, yamlContent)
  } catch (err) {
    if (process.env.DEBUG) console.log('[backend] write project file error:', err.message)
    const status = err.status || 500
    return res.status(status).json({ error: err.message || 'Failed to write project file' })
  }
  if (process.env.DEBUG) console.log('[backend] POST /api/projects path=', volumePath)
  res.status(201).json({ path: volumePath, name: slug })
})

app.post('/api/settings/unity-catalog-schema', (req, res) => {
  const { catalog, schema } = req.body || {}
  if (!catalog || typeof catalog !== 'string' || !schema || typeof schema !== 'string') {
    return res.status(400).json({ error: 'Body must include "catalog" and "schema" strings' })
  }
  const value = `${catalog.trim()}.${schema.trim()}`
  if (process.env.DEBUG) console.log('[backend] POST /api/settings/unity-catalog-schema', value)

  try {
    let content = ''
    if (fs.existsSync(ENV_LOCAL_PATH)) {
      content = fs.readFileSync(ENV_LOCAL_PATH, 'utf8')
    }
    const keyPattern = new RegExp(`^${UC_SCHEMA_KEY}=.*`, 'm')
    const newLine = `${UC_SCHEMA_KEY}=${value}`
    const updated = keyPattern.test(content)
      ? content.replace(keyPattern, newLine)
      : content.trimEnd() + (content.endsWith('\n') ? '' : '\n') + '\n' + newLine + '\n'
    fs.writeFileSync(ENV_LOCAL_PATH, updated, 'utf8')
    res.json({ ok: true, value })
  } catch (err) {
    if (process.env.DEBUG) console.log('[backend] unity-catalog-schema write error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.listen(PORT, () => {
  const hasHost = !!process.env.DATABRICKS_HOST
  const hasToken = !!process.env.DATABRICKS_TOKEN
  if (process.env.DEBUG) {
    console.log(`[backend] port=${PORT} DATABRICKS_HOST=${hasHost ? 'set' : 'missing'} DATABRICKS_TOKEN=${hasToken ? 'set' : 'missing'}`)
  }
  console.log(`Backend listening on http://localhost:${PORT}`)
})
