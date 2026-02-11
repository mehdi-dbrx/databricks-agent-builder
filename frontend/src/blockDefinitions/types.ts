import type { ComponentType } from 'react'

export type BlockTypeId = 'agent' | 'genie' | 'vectorSearch' | 'mcp'

export interface BlockDefinition {
  id: BlockTypeId
  label: string
  Icon: ComponentType<{ className?: string }>
}
