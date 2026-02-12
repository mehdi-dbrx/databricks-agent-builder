import { useState, useEffect } from 'react'
import { FolderOpen, Plus, Save } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE || ''

export const DEFAULT_PROJECT_NAME = 'my-default-agent'
const DEFAULT_PROJECT_LABEL = 'My default agent'

const SLUG_REGEX = /^[a-z0-9-]*$/
function isValidProjectName(s: string): boolean {
  if (!s.length) return false
  return SLUG_REGEX.test(s) && !s.startsWith('-') && !s.endsWith('-')
}

function getInitial(email: string | undefined): string {
  if (!email || !email.length) return '?'
  const first = email[0]
  return (/[a-zA-Z0-9]/.test(first) ? first : '?').toUpperCase()
}

interface ProjectMenuProps {
  currentProject?: string | null
  onSelectProject?: (name: string) => void
  onSave?: () => void
  saveLoading?: boolean
}

export function ProjectMenu({ currentProject, onSelectProject, onSave, saveLoading }: ProjectMenuProps) {
  const [open, setOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [projects, setProjects] = useState<{ name: string }[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [projectsError, setProjectsError] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userError, setUserError] = useState<string | null>(null)

  const fetchProjects = () => {
    setProjectsLoading(true)
    setProjectsError(null)
    fetch(`${API_BASE}/api/projects`)
      .then((r) => (r.ok ? r.json() : { projects: [] }))
      .then((d: { projects?: { name: string }[] }) => {
        setProjects(d.projects || [])
      })
      .catch(() => {
        setProjects([])
        setProjectsError('Failed to load projects')
      })
      .finally(() => setProjectsLoading(false))
  }

  const handleCreateProject = () => {
    if (!isValidProjectName(name) || createLoading) return
    setCreateLoading(true)
    setCreateError(null)
    fetch(`${API_BASE}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim().toLowerCase() }),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((d) => Promise.reject(new Error(d.error || r.statusText)))
        return r.json()
      })
      .then((data: { name?: string }) => {
        setModalOpen(false)
        setName('')
        fetchProjects()
        const createdName = data?.name ?? name.trim().toLowerCase()
        if (createdName && onSelectProject) onSelectProject(createdName)
      })
      .catch((err) => setCreateError(err.message || 'Failed to create project'))
      .finally(() => setCreateLoading(false))
  }

  useEffect(() => {
    if (open) fetchProjects()
  }, [open])

  useEffect(() => {
    let cancelled = false
    fetch(`${API_BASE}/api/me`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 401 ? 'Not authenticated' : 'Failed to load user')
        return r.json()
      })
      .then((data: { emails?: { value?: string }[]; userName?: string }) => {
        if (cancelled) return
        const email = data.emails?.[0]?.value ?? data.userName ?? null
        setUserEmail(email)
        setUserError(null)
      })
      .catch(() => {
        if (!cancelled) {
          setUserEmail(null)
          setUserError('Not connected')
        }
      })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="relative flex flex-col items-end gap-1 min-w-0 max-w-full">
      {userEmail && (
        <div className="flex items-center gap-2 px-2 py-1 rounded-md text-zinc-600 text-xs min-w-0 max-w-full">
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brick-400 text-white text-[10px] font-semibold"
            title={userEmail}
            aria-hidden
          >
            {getInitial(userEmail)}
          </span>
          <span className="truncate max-w-[140px] sm:max-w-[180px]" title={userEmail}>
            {userEmail}
          </span>
        </div>
      )}
      {userError && !userEmail && (
        <div className="text-xs text-amber-600 px-2" title={userError}>
          Not connected
        </div>
      )}
      <div className="flex items-center gap-2">
        {onSave && (
          <button
            type="button"
            onClick={onSave}
            disabled={!currentProject || saveLoading}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Save project"
            title="Save current project to .proj.yaml"
          >
            <Save className="h-5 w-5 shrink-0" style={{ color: '#f47d75' }} />
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 px-3 py-2 rounded-md text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 text-sm font-medium"
          aria-label="Projects"
        >
          <FolderOpen className="h-5 w-5 shrink-0" style={{ color: '#f47d75' }} />
          <span>Projects</span>
        </button>
      </div>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 z-20 w-56 py-2 bg-white border border-zinc-200 rounded-lg shadow-lg">
            <div className="px-3 py-2 border-b border-zinc-200 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Projects
              </span>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  setModalOpen(true)
                  setName('')
                  setCreateError(null)
                }}
                className="p-1 rounded text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                aria-label="New project"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <ul className="py-2 max-h-64 overflow-auto">
              {projectsLoading ? (
                <li className="px-3 py-2 text-sm text-zinc-500">Loading…</li>
              ) : projectsError ? (
                <li className="px-3 py-2 text-sm text-red-600">{projectsError}</li>
              ) : projects.length === 0 ? (
                <li className="px-3 py-2 text-sm text-zinc-500">No projects yet</li>
              ) : (
                projects.map((p) => (
                  <li key={p.name}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectProject?.(p.name)
                        setOpen(false)
                      }}
                      className={`w-full px-3 py-2 text-left text-sm rounded-none ${
                        currentProject === p.name
                          ? 'bg-brick-50 text-brick-800 font-medium'
                          : 'text-zinc-800 hover:bg-zinc-100'
                      }`}
                    >
                      {p.name}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </>
      )}

      {modalOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-30"
            aria-hidden
            onClick={() => setModalOpen(false)}
          />
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
            <div
              className="w-full max-w-sm bg-white border border-zinc-200 rounded-lg shadow-lg p-4"
              role="dialog"
              aria-labelledby="new-project-title"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="new-project-title" className="text-lg font-semibold text-zinc-900 mb-3">
                New project
              </h2>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().trim())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleCreateProject()
                  }
                }}
                placeholder="e.g. my-agent"
                className="w-full px-3 py-2 border border-zinc-200 rounded-md text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-brick-400 focus:border-transparent"
                autoFocus
              />
              {name.length > 0 && !isValidProjectName(name) && (
                <p className="mt-1 mb-2 text-xs text-red-600">
                  Use only letters, numbers, and hyphens (no spaces or leading/trailing hyphens).
                </p>
              )}
              {createError && (
                <p className="mt-1 mb-2 text-xs text-red-600">{createError}</p>
              )}
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={createLoading}
                  className="px-3 py-2 rounded-md text-sm font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-brick-400 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!isValidProjectName(name) || createLoading}
                  onClick={handleCreateProject}
                  className="px-3 py-2 rounded-md text-sm font-medium text-white bg-brick-500 hover:bg-brick-600 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-brick-400"
                >
                  {createLoading ? 'Creating…' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
