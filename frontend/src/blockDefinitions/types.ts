import type { ComponentType } from 'react'

export type BlockTypeId = 'agent' | 'genie' | 'vectorSearch' | 'mcp' | 'lakebaseMemory' | 'apps' | 'knowledgeAssistant' | 'multiAgentSupervisor'

export interface BlockDefinition {
  id: BlockTypeId
  label: string
  Icon: ComponentType<{ className?: string }>
}
