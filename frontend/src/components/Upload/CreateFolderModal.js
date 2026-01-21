'use client'

import { useState } from 'react'
import { Modal } from '../UI/Modal'
import { Button } from '../UI/Button'
import api from '../../lib/api'

export function CreateFolderModal({ isOpen, onClose, parentId = null, onSuccess }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await api.post('/api/folders', {
        name,
        parentId
      })
      setName('')
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to create folder')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Folder" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="folder-name" className="block text-sm font-medium text-gray-700 mb-2">
            Folder Name
          </label>
          <input
            id="folder-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Enter folder name"
            required
            autoFocus
          />
        </div>

        <div className="flex justify-end space-x-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading || !name.trim()}>
            {loading ? 'Creating...' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
