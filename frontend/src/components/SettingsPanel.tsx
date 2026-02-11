import { useState } from 'react'
import { X } from 'lucide-react'

interface SettingsPanelProps {
  open: boolean
  onClose: () => void
}

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const [schema, setSchema] = useState('')

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 z-20"
        aria-hidden
        onClick={onClose}
      />
      <div className="fixed top-0 right-0 bottom-0 w-96 bg-white border-l border-zinc-200 shadow-lg z-30 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200">
          <h2 className="text-lg font-semibold text-zinc-900">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 flex-1 overflow-auto">
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Unity Catalog schema
          </label>
          <input
            type="text"
            value={schema}
            onChange={(e) => setSchema(e.target.value)}
            placeholder="e.g. main.default"
            className="w-full px-3 py-2 border border-zinc-200 rounded-md text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-brick-400 focus:border-transparent"
          />
        </div>
      </div>
    </>
  )
}
