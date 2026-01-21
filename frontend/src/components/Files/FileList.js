'use client'

import { FileItem } from './FileItem'
import { FolderItem } from './FolderItem'
import { Loading } from '../UI/Loading'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import api from '../../lib/api'

const CATEGORIES = ['All', 'Folders', 'Images', 'Videos', 'Documents', 'Others']

export function FileList({
  folders = [],
  files = [],
  viewMode = 'grid',
  isLoading = false,
  onFolderClick,
  onFileOpen,
  onFileDownload,
  onFolderDelete,
  onFileDelete,
  onFolderShare,
  onFileShare,
  onFolderStar,
  onFileStar,
  onFolderRename,
  onFileRename,
  onFileMove,
  enableRename = false,
  enableMove = false,
  starredItems = []
}) {
  const [activeCategory, setActiveCategory] = useState('All')

  const searchParams = useSearchParams()
  const searchQuery = searchParams.get('q')

  const [searchResults, setSearchResults] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)

  useEffect(() => {
    if (!searchQuery) {
      setSearchResults(null)
      return
    }

    const runSearch = async () => {
      setSearchLoading(true)

      try {
        const res = await api.get('/api/search', {
          params: { q: searchQuery }
        })

        setSearchResults(res.data.results)
      } finally {
        setSearchLoading(false)
      }
    }

    runSearch()
  }, [searchQuery])

  const displayFolders = searchResults ? searchResults.folders : folders
  const displayFiles = searchResults ? searchResults.files : files

  if (isLoading) return <Loading />

  const isStarred = (item, type) =>
    starredItems.some(
      s => s.resource_type === type && s.resource_id === item.id
    )

  /* ✅ FIXED FILTER LOGIC */
  const filteredFiles = files.filter(file => {
    if (activeCategory === 'All') return true

    const mime =
      file.mime_type ||
      file.mimeType ||
      file.type ||
      ''

    if (activeCategory === 'Images') return mime.startsWith('image/')
    if (activeCategory === 'Videos') return mime.startsWith('video/')
    if (activeCategory === 'Documents')
      return (
        mime === 'application/pdf' ||
        mime.includes('word') ||
        mime.includes('excel') ||
        mime.includes('sheet')
      )

    if (activeCategory === 'Others')
      return !(
        mime.startsWith('image/') ||
        mime.startsWith('video/') ||
        mime.includes('pdf') ||
        mime.includes('word') ||
        mime.includes('excel') ||
        mime.includes('sheet')
      )

    return true
  })

  if (searchLoading) return <Loading />

  if (displayFolders.length === 0 && displayFiles.length === 0) {
    return (
      <div className="text-center text-gray-500 py-10">
        No files or folders
      </div>
    )
  }

  const finalFiles = searchResults ? displayFiles : filteredFiles

  return (
    <>
      {/* CATEGORY BAR */}
      <div className="flex gap-2 px-4 pt-4">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-sm border transition ${
              activeCategory === cat
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {viewMode === 'list' && (
        <div className="flex px-4 py-2 text-xs font-semibold text-gray-500">
          <div className="flex-1">Name</div>
          <div className="w-32">Size</div>
          <div className="w-60">Modified</div>
        </div>
      )}

      {/* GRID */}
      <div
        className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4'
            : 'flex flex-col divide-y p-4'
        }
      >

        {/* ✅ folders ONLY in All */}
        {(activeCategory === 'All' || activeCategory === 'Folders') &&
          displayFolders.map(folder => (
            <div key={folder.id}>
            <FolderItem
              key={folder.id}
              folder={folder}
              viewMode={viewMode}
              onClick={onFolderClick}
              onDelete={onFolderDelete}
              onShare={onFolderShare}
              onStar={onFolderStar}
              onRename={onFolderRename}
              enableRename={enableRename}
              isStarred={isStarred(folder, 'folder')}
            />
            </div>
          ))}

        {/* ✅ USE filteredFiles */}
        {activeCategory !== 'Folders' &&
        finalFiles.map(file => (
          <div key={file.id}>
          <FileItem
            key={file.id}
            file={file}
            viewMode={viewMode}
            onOpen={onFileOpen}
            onDownload={onFileDownload}
            onDelete={onFileDelete}
            onShare={onFileShare}
            onStar={onFileStar}
            onRename={onFileRename}
            onMove={onFileMove}
            enableRename={enableRename}
            enableMove={enableMove}
            isStarred={isStarred(file, 'file')}
          />
          </div>
        ))}
      </div>
    </>
  )
}
