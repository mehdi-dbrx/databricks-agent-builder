import { useState } from 'react'
import { FolderOpen } from 'lucide-react'

export function ProjectMenu() {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-md text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 text-sm font-medium"
        aria-label="Projects"
      >
        <FolderOpen className="h-5 w-5 shrink-0" style={{ color: '#f47d75' }} />
        <span>Projects</span>
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 z-20 w-56 py-2 bg-white border border-zinc-200 rounded-lg shadow-lg">
            <div className="px-3 py-2 border-b border-zinc-200">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Projects
              </span>
            </div>
            <ul className="py-2">
              <li className="px-3 py-2 text-sm text-zinc-500">
                No projects yet
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
