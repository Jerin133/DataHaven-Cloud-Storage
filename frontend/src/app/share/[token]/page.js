'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import api from '../../../lib/api'
import { Loading } from '../../../components'

export default function ShareRedirectPage() {
  const { token } = useParams()
  const router = useRouter()

  useEffect(() => {
    if (!token) return

    const resolveShare = async () => {
      try {
        const res = await api.get(`/api/link-shares/${token}`)

        const { resource, linkShare } = res.data

        // 📄 FILE
        if (linkShare.resource_type === 'file') {
          const downloadRes = await api.get(
            `/api/files/${resource.id}/download`
          )

          window.location.href = downloadRes.data.downloadUrl
          return
        }

        // 📂 FOLDER
        if (linkShare.resource_type === 'folder') {
          router.replace(`/drive/shared/${resource.id}`)
          return
        }

        router.replace('/404')
      } catch (err) {
        console.error('Invalid share link', err)
        router.replace('/404')
      }
    }

    resolveShare()
  }, [token, router])

  return <Loading fullScreen />
}
