import { createContext, useContext } from 'react'

export type NodeSettingsContextValue = {
  openNodeSettings: (nodeId: string) => void
}

export const NodeSettingsContext = createContext<NodeSettingsContextValue | null>(null)

export function useNodeSettings(): NodeSettingsContextValue {
  const ctx = useContext(NodeSettingsContext)
  if (!ctx) throw new Error('useNodeSettings must be used within NodeSettingsProvider')
  return ctx
}
