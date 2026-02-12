/**
 * One-off script to validate the Databricks client. Loads .env.local from repo root.
 * Run from backend: node scripts/test-client.js
 */
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.local') })

const { get } = require('../lib/databricks-client.js')

async function main() {
  const data = await get('/api/2.1/unity-catalog/catalogs')
  const catalogs = data?.catalogs ?? []
  console.log('OK: client returned', catalogs.length, 'catalogs')
  if (catalogs.length > 0) {
    console.log('First catalog name:', catalogs[0].name)
  }
}

main().catch((err) => {
  console.error('ERROR:', err.message)
  process.exit(1)
})
