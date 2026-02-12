import { useState, useEffect } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { useNodesState, useEdgesState } from '@xyflow/react'
import type { Node, Edge } from '@xyflow/react'
import { FlowCanvas } from './components/FlowCanvas'
import { ProjectMenu } from './components/ProjectMenu'
import { SettingsPanel } from './components/SettingsPanel'
import { Sidebar } from './components/Sidebar'
import databricksIcon from './assets/icons/databricks-symbol-color.svg'

const API_BASE = import.meta.env.VITE_API_BASE || ''

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'block',
    position: { x: 200, y: 120 },
    data: { blockType: 'agent', label: 'Agent' },
  },
]
const initialEdges: Edge[] = []

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [currentProject, setCurrentProject] = useState<string | null>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (!currentProject) return
    fetch(`${API_BASE}/api/projects/${encodeURIComponent(currentProject)}`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? 'Project not found' : 'Failed to load')
        return r.json()
      })
      .then((data: { nodes?: Node[]; edges?: Edge[] }) => {
        setNodes(Array.isArray(data.nodes) ? data.nodes : [])
        setEdges(Array.isArray(data.edges) ? data.edges : [])
      })
      .catch(() => {
        setNodes(initialNodes)
        setEdges(initialEdges)
      })
  }, [currentProject])

  const handleSave = () => {
    if (!currentProject || saveLoading) return
    setSaveLoading(true)
    setSaveError(null)
    fetch(`${API_BASE}/api/projects/${encodeURIComponent(currentProject)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodes, edges }),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((d) => Promise.reject(new Error(d.error || r.statusText)))
        return r.json()
      })
      .then(() => setSaveError(null))
      .catch((err) => setSaveError(err.message || 'Failed to save'))
      .finally(() => setSaveLoading(false))
  }

  return (
    <div className="h-full flex flex-col bg-zinc-50">
      <header className="shrink-0 px-6 py-2 border-b border-zinc-200 bg-white flex items-center justify-between gap-3 border-l-4 border-l-brick-400">
        <div className="flex items-center gap-3">
          <img
            src={databricksIcon}
            alt=""
            className="h-7 w-auto"
            width={28}
            height={31}
          />
          <h1 className="text-lg font-semibold text-zinc-900 tracking-tight">
            Databricks Agent Builder
          </h1>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
          <span
            className="text-sm font-medium text-zinc-700 truncate max-w-[200px]"
            title={currentProject ?? 'default agent project'}
          >
            {currentProject ?? 'default agent project'}
          </span>
          {saveError && (
            <span className="text-xs text-red-600" title={saveError}>
              Save failed
            </span>
          )}
        </div>
        <ProjectMenu
          currentProject={currentProject}
          onSelectProject={setCurrentProject}
          onSave={handleSave}
          saveLoading={saveLoading}
        />
      </header>
      <main className="flex-1 min-h-0 flex">
        <Sidebar onOpenSettings={() => setSettingsOpen(true)} />
        <ReactFlowProvider>
          <FlowCanvas
            nodes={nodes}
            setNodes={setNodes}
            edges={edges}
            setEdges={setEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
          />
        </ReactFlowProvider>
      </main>
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
