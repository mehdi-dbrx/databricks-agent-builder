import { memo } from 'react'
import { type Node, type NodeProps, Handle, Position, useReactFlow } from '@xyflow/react'
import { Settings, Trash2 } from 'lucide-react'
import { getBlockDefinition } from '../../blockDefinitions'
import { useNodeSettings } from '../../contexts/NodeSettingsContext'
import type { BlockTypeId } from '../../blockDefinitions'

export type BlockNodeData = {
  blockType: BlockTypeId
  label: string
}

function BlockNodeComponent(props: NodeProps<Node<BlockNodeData>>) {
  const { id, data } = props
  const def = getBlockDefinition(data.blockType)
  const label = data.label ?? def.label
  const { openNodeSettings } = useNodeSettings()
  const { deleteElements } = useReactFlow()

  return (
    <div className="relative px-4 py-3 rounded-lg bg-white border border-zinc-200 shadow-sm min-w-[140px] flex items-center gap-2 group">
      <div className="absolute top-0.5 right-0.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            deleteElements({ nodes: [{ id }] })
          }}
          className="p-0.5 rounded text-zinc-400 hover:bg-red-50 hover:text-red-600"
          aria-label="Delete block"
        >
          <Trash2 className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            openNodeSettings(id)
          }}
          className="p-0.5 rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
          aria-label="Block settings"
        >
          <Settings className="h-3 w-3" />
        </button>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2"
        style={{ background: '#f47d75', borderColor: '#fff' }}
      />
      <def.Icon className="h-4 w-4 shrink-0 text-brick-400" />
      <div className="text-sm font-medium text-zinc-800 flex-1 min-w-0 truncate">{label}</div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2"
        style={{ background: '#f47d75', borderColor: '#fff' }}
      />
    </div>
  )
}

export const BlockNode = memo(BlockNodeComponent)
