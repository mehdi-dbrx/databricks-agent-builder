/**
 * Minimal Databricks HTTP client. Reads DATABRICKS_HOST and DATABRICKS_TOKEN from env.
 * get(path), post(path, body). No per-area service layer.
 */

function getBaseUrl() {
  const host = process.env.DATABRICKS_HOST
  if (!host) throw new Error('DATABRICKS_HOST not set')
  return host.replace(/\/$/, '')
}

function getToken() {
  const token = process.env.DATABRICKS_TOKEN
  if (!token) throw new Error('DATABRICKS_TOKEN not set')
  return token
}

async function request(method, path, body = null) {
  const base = getBaseUrl()
  const token = getToken()
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : '/' + path}`
  if (process.env.DEBUG) {
    console.log(`[databricks-client] ${method} ${url}`)
  }
  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  }
  if (body != null) opts.body = JSON.stringify(body)
  const res = await fetch(url, opts)
  const text = await res.text()
  if (!res.ok) {
    const err = new Error(`Databricks API ${res.status}: ${text || res.statusText}`)
    err.status = res.status
    err.body = text
    throw err
  }
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

async function get(path) {
  return request('GET', path)
}

async function post(path, body) {
  return request('POST', path, body)
}

async function put(path, body = null) {
  return request('PUT', path, body)
}

async function putBinary(path, rawBody) {
  const base = getBaseUrl()
  const token = getToken()
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : '/' + path}`
  if (process.env.DEBUG) console.log('[databricks-client] PUT (binary)', url)
  const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody), 'utf8')
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/octet-stream',
    },
    body,
  })
  const text = await res.text()
  if (!res.ok) {
    const err = new Error(`Databricks API ${res.status}: ${text || res.statusText}`)
    err.status = res.status
    err.body = text
    throw err
  }
  return null
}

module.exports = { get, post, put, putBinary }
