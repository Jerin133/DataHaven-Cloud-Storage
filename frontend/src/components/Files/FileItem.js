'use client'

import { File, Pen, Move, MoreVertical, Download, Trash2, Share2, Star } from 'lucide-react'
import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import Image from "next/image"
import api from '../../lib/api'

export function FileItem({ file, viewMode = 'grid', onOpen, onDownload, onDelete, onShare, onStar, onRename, onMove, enableRename = false, enableMove = false, isStarred }) {
  const [showMenu, setShowMenu] = useState(false)

  const forceDownload = async (file) => {
    let url

    // Shared file
    if (file.download_url) {
      url = file.download_url
    }
    // My Drive file
    else {
      const res = await api.get(`/api/files/${file.id}/download`)
      url = res.data.downloadUrl
    }

    // 🔥 FORCE DOWNLOAD (works for ALL file types)
    const response = await fetch(url)
    const blob = await response.blob()

    const blobUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = file.name
    document.body.appendChild(link)
    link.click()

    document.body.removeChild(link)
    window.URL.revokeObjectURL(blobUrl)
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getFileIcon = (mimeType) => {
    if (mimeType?.startsWith('image/')) return '/icons/image.svg'
    if (mimeType?.startsWith('video/')) return '/icons/video.svg'
    if (mimeType === 'application/pdf') return '/icons/pdf.svg'
    if (mimeType?.includes('word')) return '/icons/word.svg'
    if (mimeType?.includes('sheet') || mimeType?.includes('excel')) return '/icons/excel.svg'
    return '/icons/file.svg'
  }

  if (viewMode === 'list') {
    return (
      <div
        onDoubleClick={() => onOpen?.(file)}
        className="group flex items-center px-4 py-2 hover:bg-gray-100 text-sm"
      >
        {/* Name */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Image
            src={getFileIcon(file.mime_type)}
            alt=""
            width={24}
            height={24}
          />
          <span className="truncate">{file.name}</span>
        </div>

        {/* Size */}
        <div className="w-32 text-gray-500">
          {formatFileSize(file.size_bytes)}
        </div>

        {/* Modified */}
        <div className="w-40 text-gray-500">
          {formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100">
          <button
            onClick={() => onStar?.(file)}
            className="p-1 rounded hover:bg-gray-200"
          >
            <Star className={`h-4 w-4 ${isStarred ? 'fill-current' : ''}`} />
          </button>

          {/* existing menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-md hover:bg-gray-200 transition-colors text-gray-400"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowMenu(false)}
                ></div>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20 border border-gray-200">
                  <button
                    onClick={() => {
                      onOpen?.(file)
                      setShowMenu(false)
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <File className="h-4 w-4 mr-2" />
                    Open
                  </button>
                  <button
                    onClick={async () => {
                      await forceDownload(file)
                      setShowMenu(false)
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </button>
                  <button
                    onClick={() => {
                      onShare?.(file)
                      setShowMenu(false)
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </button>
                  {enableRename && (
                    <button
                      onClick={() => {
                        onRename?.(file)
                        setShowMenu(false)
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Pen className="h-4 w-4 mr-2" />
                      Rename
                    </button>
                  )}

                  {enableMove && (
                    <button
                      onClick={() => {
                        onMove?.(file)
                        setShowMenu(false)
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Move className="h-4 w-4 mr-2" />
                      Move
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onDelete?.(file)
                      setShowMenu(false)
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="group relative p-4 bg-neutral-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer h-24"
      onDoubleClick={() => onOpen?.(file)}
    >
      <div className="flex items-center space-x-4">
        {/* File Icon */}
        <div className="flex-shrink-0 text-4xl">
          <Image
            src={getFileIcon(file.mime_type)}
            alt="file icon"
            width={40}
            height={40}
            className="object-contain"
          />
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 truncate">{file.name}</h3>
          <div className="flex items-center space-x-2 mt-1 text-xs text-gray-500">
            <span>{formatFileSize(file.size_bytes)}</span>
            <span>•</span>
            <span>{formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onStar?.(file)}
            className={`p-2 rounded-md hover:bg-gray-200 transition-colors ${
              isStarred ? 'text-neutral-500' : 'text-gray-400'
            }`}
            title="Star"
          >
            <Star className={`h-4 w-4 ${isStarred ? 'fill-current' : ''}`} />
          </button>
          
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-md hover:bg-gray-200 transition-colors text-gray-400"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowMenu(false)}
                ></div>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20 border border-gray-200">
                  <button
                    onClick={() => {
                      onOpen?.(file)
                      setShowMenu(false)
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <File className="h-4 w-4 mr-2" />
                    Open
                  </button>
                  <button
                    onClick={async () => {
                      await forceDownload(file)
                      setShowMenu(false)
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </button>
                  <button
                    onClick={() => {
                      onShare?.(file)
                      setShowMenu(false)
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </button>
                  {enableRename && (
                    <button
                      onClick={() => {
                        onRename?.(file)
                        setShowMenu(false)
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Pen className="h-4 w-4 mr-2" />
                      Rename
                    </button>
                  )}

                  {enableMove && (
                    <button
                      onClick={() => {
                        onMove?.(file)
                        setShowMenu(false)
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Move className="h-4 w-4 mr-2" />
                      Move
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onDelete?.(file)
                      setShowMenu(false)
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
