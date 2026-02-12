import { getBlockDefinition } from '../blockDefinitions'
import type { BlockTypeId } from '../blockDefinitions'
import type { Node } from '@xyflow/react'
import type { BlockNodeData } from './nodes/BlockNode'

interface BlockSettingsModalProps {
  node: Node<BlockNodeData> | undefined
  onClose: () => void
}

function PlaceholderContent({ blockType }: { blockType: BlockTypeId }) {
  const def = getBlockDefinition(blockType)
  const titles: Partial<Record<BlockTypeId, string>> = {
    agent: 'Agent settings',
    genie: 'Genie settings',
    vectorSearch: 'Vector Search settings',
    mcp: 'MCP settings',
    lakebaseMemory: 'Lakebase Memory settings',
    apps: 'Apps settings',
    knowledgeAssistant: 'Knowledge Assistant settings',
    multiAgentSupervisor: 'Multi-Agent Supervisor settings',
  }
  return (
    <p className="text-sm text-zinc-600">
      {titles[blockType] ?? `${def.label} settings`} — content coming soon.
    </p>
  )
}

export function BlockSettingsModal({ node, onClose }: BlockSettingsModalProps) {
  if (!node) return null
  const blockType = node.data?.blockType ?? 'agent'
  const def = getBlockDefinition(blockType)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="block-settings-title"
    >
      <div
        className="bg-white rounded-lg shadow-xl border border-zinc-200 w-full max-w-md mx-4 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 id="block-settings-title" className="text-lg font-semibold text-zinc-900">
            {def.label} settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Close"
          >
            <span className="text-lg leading-none">×</span>
          </button>
        </div>
        <PlaceholderContent blockType={blockType} />
      </div>
    </div>
  )
}
