import type { BlockTypeId, BlockDefinition } from './types'
import { agentDefinition } from './definitions/agent'
import { genieDefinition } from './definitions/genie'
import { vectorSearchDefinition } from './definitions/vectorSearch'
import { mcpDefinition } from './definitions/mcp'

export const allBlockDefinitions: BlockDefinition[] = [
  agentDefinition,
  genieDefinition,
  vectorSearchDefinition,
  mcpDefinition,
]

const byId: Record<BlockTypeId, BlockDefinition> = {
  agent: agentDefinition,
  genie: genieDefinition,
  vectorSearch: vectorSearchDefinition,
  mcp: mcpDefinition,
}

export function getBlockDefinition(id: BlockTypeId): BlockDefinition {
  return byId[id]
}

export type { BlockTypeId, BlockDefinition }

/** Used as dataTransfer type when dragging a block from the sidebar. */
export const DRAG_DATA_KEY = 'application/reactflow'
