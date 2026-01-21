'use client'
import { useState } from 'react'

export function MoveModal({ isOpen, file, folders, onClose, onSubmit }) {
  const [folderName, setFolderName] = useState('')
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleMove = () => {
    const target = folders.find(
      f => f.name.toLowerCase() === folderName.toLowerCase()
    )

    if (!target) {
      setError('Folder not found in this location')
      return
    }

    onSubmit(target)
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-96 p-6">
        <h2 className="text-lg font-semibold mb-4">
          Move "{file.name}"
        </h2>

        <input
          className="w-full border rounded-md px-3 py-2"
          placeholder="Enter folder name"
          value={folderName}
          onChange={(e) => {
            setFolderName(e.target.value)
            setError('')
          }}
          autoFocus
        />

        {error && (
          <p className="text-sm text-red-600 mt-2">{error}</p>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleMove}
            className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            Move
          </button>
        </div>
      </div>
    </div>
  )
}
