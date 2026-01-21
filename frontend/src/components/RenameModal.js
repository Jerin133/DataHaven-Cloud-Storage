'use client'
import { useState } from 'react'

export function RenameModal({ isOpen, onClose, target, onSubmit }) {
  const [name, setName] = useState(target?.item?.name || '')

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-96 p-6">
        <h2 className="text-lg font-semibold mb-4">
          Rename {target.type === 'file' ? 'File' : 'Folder'}
        </h2>

        <input
          className="w-full border rounded-md px-3 py-2 mb-4"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(name)}
            className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            Rename
          </button>
        </div>
      </div>
    </div>
  )
}
