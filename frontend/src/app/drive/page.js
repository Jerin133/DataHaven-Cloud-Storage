'use client'

import { useAuth } from '../../hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Header, Sidebar, FileList, CreateFolderModal, ShareModal, Loading } from '../../components'
import { FileUpload } from '../../components'
import api from '../../lib/api'
import { ChevronRight, Home } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { RenameModal } from '../../components/RenameModal'
import { MoveModal } from '../../components/MoveModal'
import { ViewToggle } from '../../components/ViewToggle'

export default function DrivePage() {
  const router = useRouter()
  const { user, isLoading: authLoading, logout } = useAuth()
  const queryClient = useQueryClient()
  const [currentFolderId, setCurrentFolderId] = useState(null)
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [shareResource, setShareResource] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [breadcrumbs, setBreadcrumbs] = useState([])
  const searchParams = useSearchParams();
  const [renameTarget, setRenameTarget] = useState(null)
  const [moveTarget, setMoveTarget] = useState(null)
  const [viewMode, setViewMode] = useState('grid')

  // Fetch folder contents
  const { data: folderData, isLoading: folderLoading, refetch } = useQuery({
    queryKey: ['folder', currentFolderId],
    queryFn: async () => {
      if (currentFolderId) {
        const response = await api.get(`/api/folders/${currentFolderId}`)
        return response.data
      } else {
        // Root folder - fetch root level items
        const [filesRes, foldersRes] = await Promise.all([
          api.get('/api/files?folderId=null').catch(() => ({ data: { files: [] } })),
          api.get('/api/folders?parentId=null').catch(() => ({ data: { folders: [] } }))
        ])
        return {
          folder: null,
          children: {
            folders: foldersRes.data.folders || [],
            files: filesRes.data.files || []
          },
          path: []
        }
      }
    },
    enabled: !authLoading && !!user
  })

  // Fetch starred items
  const { data: starredData = [] } = useQuery({
    queryKey: ['stars'],
    queryFn: async () => {
      const response = await api.get('/api/stars')
      return [
        ...(response.data.folders || []).map(f => ({
          resource_type: 'folder',
          resource_id: f.id
        })),
        ...(response.data.files || []).map(f => ({
          resource_type: 'file',
          resource_id: f.id
        }))
      ]
    },
    enabled: !authLoading && !!user
  })

  useEffect(() => {
    const folderIdFromUrl = searchParams.get('folderId');

    if (folderIdFromUrl) {
      setCurrentFolderId(folderIdFromUrl);
      setBreadcrumbs([]); // breadcrumbs will auto-build from API
    }
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, authLoading, router])

  const handleFileDownload = async (file) => {
    // 🔹 NEW: mark as recent
    await api.post('/api/recent/touch', {
      resourceType: 'file',
      resourceId: file.id
    })

    const response = await api.get(`/api/files/${file.id}/download`)
    window.open(response.data.downloadUrl, '_blank')
  }

  const handleDelete = async (item, type) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return

    try {
      await api.delete(`/api/${type}s/${item.id}`)
      refetch()
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete')
    }
  }

  const handleShare = (item, type) => {
    setShareResource({
      resourceType: type,
      resourceId: item.id,
      resourceName: item.name
    })
  }

  const handleStar = async (item, type) => {
    try {
      const isStarred = starredData?.some(
        star => star.resource_type === type && star.resource_id === item.id
      )

      if (isStarred) {
        await api.delete('/api/stars', {
          params: { resourceType: type, resourceId: item.id }
        })
      } else {
        await api.post('/api/stars', {
          resourceType: type,
          resourceId: item.id
        })
      }
      queryClient.invalidateQueries(['stars'])
    } catch (error) {
      console.error('Star error:', error)
    }
  }

  const handleUploadComplete = () => {
    setShowUpload(false)
    refetch()
  }

  const handleCreateFolderSuccess = () => {
    refetch()
  }

  const handleSearch = (query) => {
    setSearchQuery(query)
    // TODO: Implement search functionality
  }

  if (authLoading || folderLoading) {
    return <Loading fullScreen />
  }

  if (!user) {
    return null
  }

  const openFolder = async (folder) => {
    // 🔹 NEW: mark as recent
    await api.post('/api/recent/touch', {
      resourceType: 'folder',
      resourceId: folder.id
    })

    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }])
    setCurrentFolderId(folder.id)
  }

  const navigateToBreadcrumb = (index) => {
    if (index === -1) {
      // My Drive
      setBreadcrumbs([])
      setCurrentFolderId(null)
      return
    }
    const newCrumbs = breadcrumbs.slice(0, index + 1)
    setBreadcrumbs(newCrumbs)
    setCurrentFolderId(newCrumbs[index].id)
  }

  const handleFileOpen = async (file) => {
    const res = await api.get(`/api/files/${file.id}/download`)
    const fileUrl = res.data.downloadUrl

    const mime =
      file.mime_type ||
      file.mimeType ||
      file.type ||
      ''

    const isOfficeFile =
      mime.includes('word') ||
      mime.includes('excel') ||
      mime.includes('sheet')

    if (isOfficeFile) {
      const googleViewerUrl =
        `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`

      window.open(googleViewerUrl, '_blank')
    } else {
      window.open(fileUrl, '_blank')
    }
  }

  const handleRenameFile = (file) => {
    setRenameTarget({ type: 'file', item: file })
  }

  const handleRenameFolder = (folder) => {
    setRenameTarget({ type: 'folder', item: folder })
  }

  const handleMoveFile = (file) => {
    setMoveTarget(file)
  }

  const folders = folderData?.children?.folders || []
  const files = folderData?.children?.files || []

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <Header
          onUpload={() => setShowUpload(true)}
          onCreateFolder={() => setShowCreateFolder(true)}
          onSearch={handleSearch}
        />

        <main className="flex-1 overflow-y-auto">

          <div className="flex items-center justify-between pt-4 px-4">

            {/* LEFT: Breadcrumbs */}
            <div className="flex items-center flex-wrap gap-2 text-base text-gray-600">
              <button
                onClick={() => navigateToBreadcrumb(-1)}
                className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-200 transition"
              >
                <Home className="w-5 h-5" />
                <span className="font-medium">My Drive</span>
              </button>

              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.id} className="flex items-center gap-2">
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                  <button
                    onClick={() => navigateToBreadcrumb(index)}
                    className={`px-3 py-2 rounded-md transition ${
                      index === breadcrumbs.length - 1
                        ? 'bg-gray-200 text-gray-900 font-medium cursor-default'
                        : 'hover:bg-gray-200 text-gray-700'
                    }`}
                    disabled={index === breadcrumbs.length - 1}
                  >
                    {crumb.name}
                  </button>
                </div>
              ))}
            </div>

            {/* RIGHT: View Toggle */}
            <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
          </div>


          {renameTarget && (
            <RenameModal
              isOpen={!!renameTarget}
              target={renameTarget}
              onClose={() => setRenameTarget(null)}
              onSubmit={async (newName) => {
                if (renameTarget.type === 'file') {
                  await api.patch(`/api/files/${renameTarget.item.id}`, { name: newName })
                } else {
                  await api.patch(`/api/folders/${renameTarget.item.id}`, { name: newName })
                }
                setRenameTarget(null)
                refetch()
              }}
            />
          )}

          {moveTarget && (
            <MoveModal
              isOpen={!!moveTarget}
              file={moveTarget}
              folders={folders}
              onClose={() => setMoveTarget(null)}
              onSubmit={async (targetFolder) => {
                await api.patch(`/api/files/${moveTarget.id}`, {
                  folderId: targetFolder.id
                })
                setMoveTarget(null)
                refetch()
              }}
            />
          )}

          {showUpload && (
            <div className="max-w-2xl mx-auto p-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Upload Files</h2>
                <FileUpload
                  folderId={currentFolderId}
                  onUploadComplete={handleUploadComplete}
                />
                <button
                  onClick={() => setShowUpload(false)}
                  className="mt-4 text-sm text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {!showUpload && (
            <div className="p-0">

              <FileList
                folders={folders}
                files={files}
                viewMode={viewMode} 
                onFolderClick={openFolder}
                onFileOpen={handleFileOpen}
                onFolderRename={handleRenameFolder}
                onFileRename={handleRenameFile}
                onFileMove={handleMoveFile}
                enableRename
                enableMove
                onFileDownload={handleFileDownload}
                onFolderDelete={(folder) => handleDelete(folder, 'folder')}
                onFileDelete={(file) => handleDelete(file, 'file')}
                onFolderShare={(folder) => handleShare(folder, 'folder')}
                onFileShare={(file) => handleShare(file, 'file')}
                onFolderStar={(folder) => handleStar(folder, 'folder')}
                onFileStar={(file) => handleStar(file, 'file')}
                starredItems={starredData || []}
              />
            </div>
          )}
        </main>
      </div>

      <CreateFolderModal
        isOpen={showCreateFolder}
        onClose={() => setShowCreateFolder(false)}
        parentId={currentFolderId}
        onSuccess={handleCreateFolderSuccess}
      />

      {shareResource && (
        <ShareModal
          isOpen={!!shareResource}
          onClose={() => setShareResource(null)}
          resourceType={shareResource.resourceType}
          resourceId={shareResource.resourceId}
          resourceName={shareResource.resourceName}
        />
      )}
    </div>
  )
}
