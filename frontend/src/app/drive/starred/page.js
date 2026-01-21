'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Sidebar, Header, FileList, Loading } from '../../../components';
import { useAuth } from '../../../hooks/useAuth';
import api from '../../../lib/api';
import { ChevronRight, Star } from 'lucide-react';
import { RenameModal } from '../../../components/RenameModal'
import { MoveModal } from '../../../components/MoveModal'
import { ViewToggle } from '../../../components/ViewToggle'

export default function StarredPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([]);

  const [renameTarget, setRenameTarget] = useState(null)
  const [moveTarget, setMoveTarget] = useState(null)

  const [viewMode, setViewMode] = useState('grid')

  const { data, isLoading } = useQuery({
    queryKey: ['starred-view', currentFolderId],
    queryFn: async () => {
      // ⭐ ROOT STARRED VIEW
      if (!currentFolderId) {
        const res = await api.get('/api/stars');
        return {
          children: {
            folders: res.data.folders || [],
            files: res.data.files || []
          },
          path: []
        };
      }

      // 📂 INSIDE A FOLDER (normal behavior)
      const res = await api.get(`/api/folders/${currentFolderId}`);
      return res.data;
    },
    enabled: !!user
  });

  const queryClient = useQueryClient();

  const handleUnstar = async (item, type) => {
    try {
      await api.delete('/api/stars', {
        params: {
          resourceType: type,
          resourceId: item.id,
        },
      });

      // 🔥 Refresh starred page immediately
      queryClient.invalidateQueries(['starred']);
    } catch (error) {
      console.error('Unstar error:', error);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || isLoading) {
    return <Loading fullScreen />;
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
      setBreadcrumbs([]);
      setCurrentFolderId(null);
      return;
    }

    const next = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(next);
    setCurrentFolderId(next[index].id);
  };

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

  const folders = data?.children?.folders || [];
  const files = data?.children?.files || [];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header hideUpload hideCreateFolder />

        <main className="flex-1 overflow-y-auto">

          <div className="flex items-center justify-between pt-4 px-4">
            <div className="flex items-center gap-2 text-base text-gray-600">
              <button
                onClick={() => navigateToBreadcrumb(-1)}
                className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-200"
              >
                <Star className="w-5 h-5" />
                <span className="font-medium">Starred</span>
              </button>

              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.id} className="flex items-center gap-2">
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                  <button
                    onClick={() => navigateToBreadcrumb(index)}
                    className={`px-3 py-2 rounded-md ${
                      index === breadcrumbs.length - 1
                        ? 'bg-gray-200 font-medium'
                        : 'hover:bg-gray-200'
                    }`}
                  >
                    {crumb.name}
                  </button>
                </div>
              ))}
            </div>

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
                queryClient?.invalidateQueries()
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
                queryClient?.invalidateQueries()
              }}
            />
          )}

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
              onFolderStar={(folder) => handleUnstar(folder, 'folder')}
              onFileStar={(file) => handleUnstar(file, 'file')}
              starredItems={[
                ...folders.map(f => ({ resource_type: 'folder', resource_id: f.id })),
                ...files.map(f => ({ resource_type: 'file', resource_id: f.id }))
              ]}
            />
          </div>
        </main>
      </div>
    </div>
  );
}