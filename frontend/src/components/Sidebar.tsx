import { useState } from 'react'
import { Settings, Layout, LayoutGrid, ChevronRight, BookOpenText, Expand } from 'lucide-react'
import { allBlockDefinitions, DRAG_DATA_KEY } from '../blockDefinitions'
import { appsDefinition } from '../blockDefinitions/definitions/apps'
import { knowledgeAssistantDefinition } from '../blockDefinitions/definitions/knowledgeAssistant'
import { multiAgentSupervisorDefinition } from '../blockDefinitions/definitions/multiAgentSupervisor'

interface SidebarProps {
  onOpenSettings?: () => void
}

export function Sidebar({ onOpenSettings }: SidebarProps) {
  const [agentBricksOpen, setAgentBricksOpen] = useState(false)

  const blockButtonClass =
    'w-full flex items-center gap-3 px-3 py-2 rounded-md text-left text-sm font-medium text-zinc-800 hover:bg-brick-50 hover:text-zinc-900 border border-transparent hover:border-brick-200 transition-colors'

  return (
    <aside className="w-60 shrink-0 border-r border-zinc-200 bg-white flex flex-col">
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
              className={blockButtonClass}
            >
              <def.Icon className="h-5 w-5 shrink-0 text-[#f47d75]" />
              {def.label}
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(DRAG_DATA_KEY, appsDefinition.id)
              e.dataTransfer.effectAllowed = 'move'
            }}
            className={blockButtonClass}
          >
            <Layout className="h-5 w-5 shrink-0 text-[#f47d75]" />
            Apps
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() => setAgentBricksOpen((o) => !o)}
            className={blockButtonClass}
          >
            <LayoutGrid className="h-5 w-5 shrink-0 text-[#f47d75]" />
            Agent Bricks
            <ChevronRight
              className={`h-4 w-4 shrink-0 ml-auto transition-transform ${agentBricksOpen ? 'rotate-90' : ''} text-[#f47d75]`}
            />
          </button>
          {agentBricksOpen && (
            <ul className="pl-8 pr-2 py-1 flex flex-col gap-0.5 mt-0.5">
              <li>
                <button
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(DRAG_DATA_KEY, knowledgeAssistantDefinition.id)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-xs text-zinc-700 hover:bg-brick-50 hover:text-zinc-900 whitespace-nowrap min-w-0"
                >
                  <BookOpenText className="h-3.5 w-3.5 shrink-0 text-[#f47d75]" />
                  <span className="truncate">Knowledge Assistant</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(DRAG_DATA_KEY, multiAgentSupervisorDefinition.id)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-xs text-zinc-700 hover:bg-brick-50 hover:text-zinc-900 whitespace-nowrap min-w-0"
                >
                  <Expand className="h-3.5 w-3.5 shrink-0 text-[#f47d75]" />
                  <span className="truncate">Multi-Agent Supervisor</span>
                </button>
              </li>
            </ul>
          )}
        </li>
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

