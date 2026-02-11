import { useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { FlowCanvas } from './components/FlowCanvas'
import { ProjectMenu } from './components/ProjectMenu'
import { SettingsPanel } from './components/SettingsPanel'
import { Sidebar } from './components/Sidebar'
import databricksIcon from './assets/icons/databricks-symbol-color.svg'

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <div className="h-full flex flex-col bg-zinc-50">
      <header className="shrink-0 px-6 py-4 border-b border-zinc-200 bg-white flex items-center justify-between gap-3 border-l-4 border-l-brick-400">
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
        <ProjectMenu />
      </header>
      <main className="flex-1 min-h-0 flex">
        <Sidebar onOpenSettings={() => setSettingsOpen(true)} />
        <ReactFlowProvider>
          <FlowCanvas />
        </ReactFlowProvider>
      </main>
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
