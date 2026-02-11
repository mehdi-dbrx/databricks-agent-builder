import { Settings } from 'lucide-react'
import { allBlockDefinitions, DRAG_DATA_KEY } from '../blockDefinitions'

interface SidebarProps {
  onOpenSettings?: () => void
}

export function Sidebar({ onOpenSettings }: SidebarProps) {
  return (
    <aside className="w-52 shrink-0 border-r border-zinc-200 bg-white flex flex-col">
      <div className="px-3 py-3 border-b border-zinc-200">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          Blocks
        </h2>
      </div>
      <ul className="p-2 flex flex-col gap-1 flex-1 min-h-0">
        {allBlockDefinitions.map((def) => (
          <li key={def.id}>
            <button
              type="button"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(DRAG_DATA_KEY, def.id)
                e.dataTransfer.effectAllowed = 'move'
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-left text-sm font-medium text-zinc-800 hover:bg-brick-50 hover:text-zinc-900 border border-transparent hover:border-brick-200 transition-colors"
            >
              <def.Icon className="h-5 w-5 shrink-0" style={{ color: '#f47d75' }} />
              {def.label}
            </button>
          </li>
        ))}
      </ul>
      <div className="p-2 border-t border-zinc-200">
        <button
          type="button"
          onClick={onOpenSettings}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-left text-sm font-medium text-zinc-800 hover:bg-brick-50 hover:text-zinc-900 border border-transparent hover:border-brick-200 transition-colors"
        >
          <Settings className="h-5 w-5 shrink-0" style={{ color: '#f47d75' }} />
          Settings
        </button>
      </div>
    </aside>
  )
}

