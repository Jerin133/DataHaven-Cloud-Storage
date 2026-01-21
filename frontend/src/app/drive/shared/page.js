'use client'

import { useQuery } from '@tanstack/react-query'
import { Sidebar, Header, FolderItem, FileItem, Loading } from '../../../components'
import api from '../../../lib/api'
import { Users } from 'lucide-react'
import { useRouter } from 'next/navigation'

function getPermissions(role) {
  return {
    canOpen: true,
    canDownload: true,
    canEdit: role === 'editor',
    canDelete: role === 'editor',
    canMove: role === 'editor',
    canRename: role === 'editor',
    canShare: role === 'editor'
  }
}

export default function SharedWithMePage() {

  /* 🔗 Fetch shared items */
  const { data = [], isLoading } = useQuery({
    queryKey: ['shared-with-me'],
    queryFn: async () => {
        const res = await api.get('/api/shares/shared-with-me')
        return res.data.items || []
    }
    })

    const router = useRouter()

    const openFolder = (folder) => {
      router.push(`/drive/shared/${folder.id}`)
    }

    const openFile = (file) => {
      window.open(file.download_url, '_blank')
    }

  const openSharedFilePreview = (file) => {
    const fileUrl = file.download_url
    const mime = file.mime_type || ''

    // 🔹 Word / Excel → Google Docs Viewer
    if (
      mime.includes('word') ||
      mime.includes('excel') ||
      mime.includes('sheet')
    ) {
      const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(
        window.location.origin + fileUrl
      )}&embedded=true`

      window.open(viewerUrl, '_blank')
      return
    }

    // 🔹 Everything else
    window.open(fileUrl, '_blank')
  }

  if (isLoading) return <Loading fullScreen />

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        {/* Disable upload & create */}
        <Header hideUpload hideCreateFolder />

        <main className="flex-1 overflow-y-auto p-4">

          {/* Page title */}
          <div className="flex items-center gap-2 text-gray-600 mb-6">
            <Users className="w-5 h-5" />
            <h1 className="text-lg font-semibold">Shared with me</h1>
          </div>

          {data.length === 0 && (
            <p className="text-sm text-gray-500">
              No files or folders shared with you.
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {data.map(item => {
              const permissions = getPermissions(item.role)

              if (item.type === 'folder') {
                return (
                  <FolderItem
                    key={`folder-${item.data.id}`}
                    folder={item.data}
                    permissions={permissions}
                    onClick={permissions.canOpen ? openFolder : undefined}
                    footer={
                      <span className="text-xs text-gray-500">
                        Shared by {item.sharedBy?.email}
                      </span>
                    }
                  />
                )
              }

              return (
                <FileItem
                  key={`file-${item.data.id}`}
                  file={{
                    ...item.data,
                    download_url: `/api/shares/files/${item.data.id}/download`
                  }}
                  permissions={permissions}
                  onOpen={permissions.canOpen ? openSharedFilePreview : undefined}
                  footer={
                    <span className="text-xs text-gray-500">
                      Shared by {item.sharedBy?.email}
                    </span>
                  }
                />
              )
            })}
          </div>

        </main>
      </div>
    </div>
  )
}
