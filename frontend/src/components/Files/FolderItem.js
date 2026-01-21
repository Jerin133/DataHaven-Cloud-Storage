'use client'

import { Folder, File, Pen, MoreVertical, Trash2, Share2, Star } from 'lucide-react'
import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'

export function FolderItem({ folder, viewMode = 'grid', onClick, onDelete, onShare, onStar, onRename, enableRename = false, isStarred }) {
  const [showMenu, setShowMenu] = useState(false)

  if (viewMode === 'list') {
    return (
      <div
        onDoubleClick={() => onClick?.(folder)}
        className="group flex items-center px-4 py-2 hover:bg-gray-100 text-sm"
      >
        {/* Name */}
        <div className="flex items-center gap-3 flex-1">
          <Folder className="h-6 w-6 text-yellow-400 fill-yellow-400" />
          <span className="truncate">{folder.name}</span>
        </div>

        {/* Size */}
        <div className="w-32 text-gray-400">—</div>

        {/* Modified */}
        <div className="w-40 text-gray-500">
          {formatDistanceToNow(new Date(folder.created_at), { addSuffix: true })}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100">
          <button
            onClick={() => onStar?.(folder)}
            className="p-1 rounded hover:bg-gray-200"
          >
            <Star className={`h-4 w-4 ${isStarred ? 'fill-current' : ''}`} />
          </button>
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
                      onClick?.(folder)
                      setShowMenu(false)
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <File className="h-4 w-4 mr-2" />
                    Open
                  </button>
                  <button
                    onClick={() => {
                      onShare?.(folder)
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
                        onRename?.(folder)
                        setShowMenu(false)
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Pen className="h-4 w-4 mr-2" />
                      Rename
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onDelete?.(folder)
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
    )
  }

  return (
    <div 
      className="group relative p-4 bg-neutral-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
      onDoubleClick={() => onClick?.(folder)}
    >
      <div className="flex items-center space-x-4">
        {/* Folder Icon */}
        <div className="flex-shrink-0">
          <Folder className="h-12 w-12 text-yellow-400 fill-yellow-400" />
        </div>

        {/* Folder Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 truncate">{folder.name}</h3>
          <div className="mt-1 text-xs text-gray-500">
            {formatDistanceToNow(new Date(folder.created_at), { addSuffix: true })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onStar?.(folder)}
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
                      onClick?.(folder)
                      setShowMenu(false)
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <File className="h-4 w-4 mr-2" />
                    Open
                  </button>
                  <button
                    onClick={() => {
                      onShare?.(folder)
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
                        onRename?.(folder)
                        setShowMenu(false)
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Pen className="h-4 w-4 mr-2" />
                      Rename
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onDelete?.(folder)
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
