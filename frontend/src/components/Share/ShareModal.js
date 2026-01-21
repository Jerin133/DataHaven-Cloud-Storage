'use client'

import { useState } from 'react'
import { Modal } from '../UI/Modal'
import { Button } from '../UI/Button'
import { Copy, Check } from 'lucide-react'
import api from '../../lib/api'

export function ShareModal({ isOpen, onClose, resourceType, resourceId, resourceName }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('viewer')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [linkToken, setLinkToken] = useState('')
  const [copied, setCopied] = useState(false)

  const handleShare = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // TODO: Get user ID from email (this is simplified)
      const response = await api.post('/api/shares', {
        resourceType,
        resourceId,
        email, // This should be user ID in real implementation
        role
      })
      setEmail('')
      onClose()
      // Refresh data
      window.location.reload()
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to share')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateLink = async () => {
    try {
      const response = await api.post('/api/link-shares', {
        resourceType,
        resourceId
      })
      setLinkToken(response.data.shareUrl)
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to create link')
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(linkToken)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Share "${resourceName}"`} size="md">
      <div className="space-y-6">
        {/* Share with user */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Share with people</h3>
          <form onSubmit={handleShare} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}
            <Button type="submit" variant="primary" disabled={loading} className="w-full">
              {loading ? 'Sharing...' : 'Share'}
            </Button>
          </form>
        </div>

        {/* Public link */}
        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Get link</h3>
          {!linkToken ? (
            <Button variant="secondary" onClick={handleCreateLink} className="w-full">
              Create link
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={linkToken}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                />
                <button
                  onClick={handleCopyLink}
                  className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  title="Copy link"
                >
                  {copied ? (
                    <Check className="h-5 w-5 text-green-600" />
                  ) : (
                    <Copy className="h-5 w-5 text-gray-600" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500">Anyone with the link can view</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
