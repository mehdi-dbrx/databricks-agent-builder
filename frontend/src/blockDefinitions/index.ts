import type { BlockTypeId, BlockDefinition } from './types'
import { agentDefinition } from './definitions/agent'
import { genieDefinition } from './definitions/genie'
import { vectorSearchDefinition } from './definitions/vectorSearch'
import { mcpDefinition } from './definitions/mcp'
import { lakebaseMemoryDefinition } from './definitions/lakebaseMemory'
import { appsDefinition } from './definitions/apps'
import { knowledgeAssistantDefinition } from './definitions/knowledgeAssistant'
import { multiAgentSupervisorDefinition } from './definitions/multiAgentSupervisor'

export const allBlockDefinitions: BlockDefinition[] = [
  agentDefinition,
  genieDefinition,
  vectorSearchDefinition,
  mcpDefinition,
  lakebaseMemoryDefinition,
]

const byId: Record<BlockTypeId, BlockDefinition> = {
  agent: agentDefinition,
  genie: genieDefinition,
  vectorSearch: vectorSearchDefinition,
  mcp: mcpDefinition,
  lakebaseMemory: lakebaseMemoryDefinition,
  apps: appsDefinition,
  knowledgeAssistant: knowledgeAssistantDefinition,
  multiAgentSupervisor: multiAgentSupervisorDefinition,
}

export function getBlockDefinition(id: BlockTypeId): BlockDefinition {
  return byId[id]
}

export type { BlockTypeId, BlockDefinition }

/** Used as dataTransfer type when dragging a block from the sidebar. */
export const DRAG_DATA_KEY = 'application/reactflow'
