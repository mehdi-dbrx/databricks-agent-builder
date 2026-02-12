import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Save, X } from 'lucide-react'
import type { Catalog, CatalogsResponse, Schema, SchemasResponse } from '../types/databricks'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

interface SettingsPanelProps {
  open: boolean
  onClose: () => void
}

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const [schema, setSchema] = useState('')
  const [catalogs, setCatalogs] = useState<Catalog[]>([])
  const [catalogsError, setCatalogsError] = useState<string | null>(null)
  const [catalog, setCatalog] = useState('')
  const [catalogListOpen, setCatalogListOpen] = useState(false)
  const [catalogFilter, setCatalogFilter] = useState('')
  const catalogListRef = useRef<HTMLDivElement>(null)
  const catalogFilterInputRef = useRef<HTMLInputElement>(null)

  const [schemas, setSchemas] = useState<Schema[]>([])
  const [schemasError, setSchemasError] = useState<string | null>(null)
  const [schemaListOpen, setSchemaListOpen] = useState(false)
  const [schemaFilter, setSchemaFilter] = useState('')
  const schemaListRef = useRef<HTMLDivElement>(null)
  const schemaFilterInputRef = useRef<HTMLInputElement>(null)

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)

  const filteredCatalogs = catalogFilter.trim()
    ? catalogs.filter((c) =>
        c.name.toLowerCase().includes(catalogFilter.toLowerCase()),
      )
    : catalogs

  const filteredSchemas = schemaFilter.trim()
    ? schemas.filter((s) =>
        s.name.toLowerCase().includes(schemaFilter.toLowerCase()),
      )
    : schemas

  useEffect(() => {
    if (!catalogListOpen) return
    setCatalogFilter('')
    catalogFilterInputRef.current?.focus()
    const onOutside = (e: MouseEvent) => {
      if (catalogListRef.current?.contains(e.target as Node)) return
      setCatalogListOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [catalogListOpen])

  useEffect(() => {
    if (!schemaListOpen) return
    setSchemaFilter('')
    schemaFilterInputRef.current?.focus()
    const onOutside = (e: MouseEvent) => {
      if (schemaListRef.current?.contains(e.target as Node)) return
      setSchemaListOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [schemaListOpen])

  useEffect(() => {
    if (!open) return
    setCatalogsError(null)
    fetch(`${API_BASE || ''}/api/catalogs`)
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText)
        return res.json() as Promise<CatalogsResponse>
      })
      .then((data) => setCatalogs(data.catalogs ?? []))
      .catch((err) => setCatalogsError(err.message))
  }, [open])

  useEffect(() => {
    if (!open) return
    fetch(`${API_BASE || ''}/api/settings/unity-catalog-schema`)
      .then((r) => r.ok ? r.json() : { value: null })
      .then((d) => {
        const v = typeof d?.value === 'string' ? d.value.trim() : ''
        const i = v.indexOf('.')
        if (i > 0 && i < v.length - 1) {
          const cat = v.slice(0, i)
          const sch = v.slice(i + 1)
          setTimeout(() => {
            setCatalog(cat)
            setSchema(sch)
          }, 0)
        }
      })
      .catch(() => {})
  }, [open])

  const handleSave = () => {
    if (!catalog || !schema) return
    setSaveStatus('saving')
    setSaveError(null)
    fetch(`${API_BASE}/api/settings/unity-catalog-schema`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ catalog, schema }),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(new Error(d.error || res.statusText)))
        return res.json()
      })
      .then(() => {
        setSaveStatus('ok')
        setTimeout(() => setSaveStatus('idle'), 2000)
      })
      .catch((err) => {
        setSaveStatus('error')
        setSaveError(err.message)
      })
  }

  useEffect(() => {
    if (!catalog) {
      setSchemas([])
      setSchemasError(null)
      setSchema('')
      return
    }
    setSchemasError(null)
    fetch(`${API_BASE || ''}/api/schemas?catalog=${encodeURIComponent(catalog)}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText)
        return res.json() as Promise<SchemasResponse>
      })
      .then((data) => setSchemas(data.schemas ?? []))
      .catch((err) => setSchemasError(err.message))
  }, [catalog])

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 z-20"
        aria-hidden
        onClick={onClose}
      />
      <div className="fixed inset-0 z-30 flex items-center justify-center p-4" onClick={onClose}>
        <div
          className="w-full max-w-md bg-white border border-zinc-200 rounded-lg shadow-lg flex flex-col max-h-[90vh]"
          role="dialog"
          aria-labelledby="settings-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 shrink-0">
            <h2 id="settings-title" className="text-lg font-semibold text-zinc-900">Settings</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Unity Catalog
            </label>
            {catalogsError ? (
              <p className="text-sm text-red-600">{catalogsError}</p>
            ) : (
              <div className="relative" ref={catalogListRef}>
                <button
                  type="button"
                  onClick={() => setCatalogListOpen((o) => !o)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-zinc-200 rounded-md text-sm text-zinc-900 bg-white hover:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-brick-400 focus:border-transparent text-left"
                >
                  <span className={catalog ? '' : 'text-zinc-500'}>
                    {catalog || 'Select catalog'}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500" />
                </button>
                {catalogListOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 max-h-56 overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg z-10 flex flex-col">
                    <input
                      ref={catalogFilterInputRef}
                      type="text"
                      value={catalogFilter}
                      onChange={(e) => setCatalogFilter(e.target.value)}
                      onMouseDown={(e) => e.stopPropagation()}
                      placeholder="Type to filter..."
                      className="m-2 px-3 py-2 border border-zinc-200 rounded-md text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-brick-400 focus:border-transparent"
                    />
                    <div className="overflow-auto py-1 max-h-44">
                      {filteredCatalogs.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => {
                          setCatalog(c.name)
                          setCatalogListOpen(false)
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-zinc-800 hover:bg-brick-50 hover:text-zinc-900"
                      >
                        {c.name}
                      </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Unity Catalog schema
            </label>
            {!catalog ? (
              <p className="px-3 py-2 text-sm text-zinc-500 border border-zinc-200 rounded-md bg-zinc-50">
                Select a catalog first
              </p>
            ) : schemasError ? (
              <p className="text-sm text-red-600">{schemasError}</p>
            ) : (
              <div className="relative" ref={schemaListRef}>
                <button
                  type="button"
                  onClick={() => setSchemaListOpen((o) => !o)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-zinc-200 rounded-md text-sm text-zinc-900 bg-white hover:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-brick-400 focus:border-transparent text-left"
                >
                  <span className={schema ? '' : 'text-zinc-500'}>
                    {schema || 'Select schema'}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500" />
                </button>
                {schemaListOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 max-h-56 overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg z-10 flex flex-col">
                    <input
                      ref={schemaFilterInputRef}
                      type="text"
                      value={schemaFilter}
                      onChange={(e) => setSchemaFilter(e.target.value)}
                      onMouseDown={(e) => e.stopPropagation()}
                      placeholder="Type to filter..."
                      className="m-2 px-3 py-2 border border-zinc-200 rounded-md text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-brick-400 focus:border-transparent"
                    />
                    <div className="overflow-auto py-1 max-h-44">
                      {filteredSchemas.map((s) => (
                        <button
                          key={s.name}
                          type="button"
                          onClick={() => {
                            setSchema(s.name)
                            setSchemaListOpen(false)
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-zinc-800 hover:bg-brick-50 hover:text-zinc-900"
                        >
                          {s.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          </div>
          <div className="shrink-0 p-4 border-t border-zinc-200 bg-zinc-50 rounded-b-lg">
            <button
            type="button"
            onClick={handleSave}
            disabled={!catalog || !schema || saveStatus === 'saving'}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold shadow-sm border transition-colors bg-[#ea5244] text-white border-brick-600/30 hover:bg-[#d63a2c] hover:border-brick-600/50 active:bg-[#b32e22] focus:outline-none focus:ring-2 focus:ring-brick-400 focus:ring-offset-2 focus:ring-offset-zinc-50 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 disabled:border-zinc-300"
          >
            <Save className="h-4 w-4 shrink-0" />
            {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'ok' ? 'Saved' : 'Save'}
          </button>
            {saveStatus === 'error' && saveError && (
              <p className="mt-2 text-sm text-red-600">{saveError}</p>
            )}
          </div>
        </div>
      </div>
      </div>
    </>
  )
}
