import { memo } from 'react'
import { type NodeProps, Handle, Position } from '@xyflow/react'
import { getBlockDefinition } from '../../blockDefinitions'
import type { BlockTypeId } from '../../blockDefinitions'

export type BlockNodeData = {
  blockType: BlockTypeId
  label: string
}

function BlockNodeComponent({ data }: NodeProps<BlockNodeData>) {
  const def = getBlockDefinition(data.blockType)
  const label = data.label ?? def.label

  return (
    <div className="px-4 py-3 rounded-lg bg-white border border-zinc-200 shadow-sm min-w-[140px] flex items-center gap-2">
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2"
        style={{ background: '#f47d75', borderColor: '#fff' }}
      />
      <def.Icon className="h-4 w-4 shrink-0 text-brick-400" />
      <div className="text-sm font-medium text-zinc-800">{label}</div>
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
