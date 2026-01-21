'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Sidebar, Header, FolderItem, FileItem, Loading } from '../../../../components'
import api from '../../../../lib/api'

export default function SharedFolderPage() {
  const { folderId } = useParams()
  const router = useRouter()

  const openFolder = (folder) => {
    router.push(`/drive/shared/${folder.id}`)
  }

  const openFile = (file) => {
    window.open(file.download_url, '_blank')
  }

  const { data = [], isLoading } = useQuery({
    queryKey: ['shared-folder', folderId],
    queryFn: async () => {
    const res = await api.get(`/api/shares/${folderId}/shared-contents`)
    return res.data.items || []
    },
    enabled: !!folderId
  })

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
        <Header hideUpload hideCreateFolder />

        <main className="flex-1 overflow-y-auto p-4">

          {/* Breadcrumbs */}
          <nav className="flex items-center text-sm text-gray-600 mb-2 gap-1">
            <span
              className="cursor-pointer hover:underline"
              onClick={() => router.push('/drive/shared')}
            >
              Shared with me
            </span>
          </nav>

          {/* Folder name */}
          <h1 className="text-lg font-semibold mb-4">
            Shared Folder
          </h1>

          {data.length === 0 && (
            <p className="text-sm text-gray-500">
              This folder is empty.
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {data.map(item =>
              item.type === 'folder' ? (
                <FolderItem
                  key={item.data.id}
                  folder={item.data}
                  onClick={() => openFolder(item.data)}
                />
              ) : (
                <FileItem
                  key={item.data.id}
                  file={{
                    ...item.data,
                    download_url: `/api/shares/files/${item.data.id}/download`
                  }}
                  onClick={openSharedFilePreview}
                />
              )
            )}
          </div>

        </main>
      </div>
    </div>
  )
}
