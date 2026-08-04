import { http, HttpResponse } from 'msw'

import type { Connector, FileItem, StorageSummary } from '../../../../features/files/api/contracts'
import filesFixture from '../fixtures/files.json'
import { API_BASE, notFound, requireAuth, validationError } from './helpers'

let files = structuredClone(filesFixture.files) as FileItem[]
const storage = filesFixture.storage as StorageSummary
const connectors = filesFixture.connectors as Connector[]

export const fileHandlers = [
  http.get(`${API_BASE}/files/storage`, async ({ request }) => {
    const unauthorized = await requireAuth(request)
    if (unauthorized) return unauthorized
    return HttpResponse.json({ ...storage, count: files.length })
  }),

  http.get(`${API_BASE}/files/connectors`, async ({ request }) => {
    const unauthorized = await requireAuth(request)
    if (unauthorized) return unauthorized
    return HttpResponse.json(connectors)
  }),

  http.get(`${API_BASE}/files`, async ({ request }) => {
    const unauthorized = await requireAuth(request)
    if (unauthorized) return unauthorized

    const query = new URL(request.url).searchParams.get('q')?.trim().toLocaleLowerCase('fr')
    const result = query
      ? files.filter((file) => file.name.toLocaleLowerCase('fr').includes(query))
      : files
    return HttpResponse.json(result)
  }),

  http.post(`${API_BASE}/files`, async ({ request }) => {
    const unauthorized = await requireAuth(request)
    if (unauthorized) return unauthorized

    const formData = await request.formData()
    const uploads = formData.getAll('file').filter((value): value is File => value instanceof File)
    if (!uploads.length) return validationError('Au moins un fichier est obligatoire.')

    const typeOf = (name: string): FileItem['type'] => {
      const ext = name.split('.').pop()?.toLowerCase() ?? ''
      if (ext === 'pdf') return 'pdf'
      if (['xlsx', 'xls', 'csv'].includes(ext)) return 'sheet'
      if (['doc', 'docx', 'txt', 'md'].includes(ext)) return 'doc'
      return 'other'
    }
    const created = uploads.map<FileItem>((file) => {
      const id = crypto.randomUUID()
      const kb = Math.max(1, Math.round(file.size / 1024))
      return {
        id,
        name: file.name,
        type: typeOf(file.name),
        kind: file.name.split('.').pop()?.toUpperCase() ?? 'Fichier',
        agent: '—',
        size: kb >= 1024 ? `${(kb / 1024).toFixed(1)} Mo` : `${kb} Ko`,
        date: "à l'instant",
        storageKey: `s3://yelema/ws_3/${id}`,
      }
    })
    files = [...created, ...files]
    return HttpResponse.json(created, { status: 201 })
  }),

  http.get(`${API_BASE}/files/:fileId/download`, async ({ request, params }) => {
    const unauthorized = await requireAuth(request)
    if (unauthorized) return unauthorized

    const file = files.find((item) => item.id === params.fileId)
    if (!file) return notFound('Fichier introuvable.')
    return new HttpResponse(`Contenu simulé de ${file.name}`, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${file.name}"`,
      },
    })
  }),

  http.get(`${API_BASE}/files/:fileId`, async ({ request, params }) => {
    const unauthorized = await requireAuth(request)
    if (unauthorized) return unauthorized

    const file = files.find((item) => item.id === params.fileId)
    return file ? HttpResponse.json(file) : notFound('Fichier introuvable.')
  }),

  http.delete(`${API_BASE}/files/:fileId`, async ({ request, params }) => {
    const unauthorized = await requireAuth(request)
    if (unauthorized) return unauthorized

    const exists = files.some((item) => item.id === params.fileId)
    if (!exists) return notFound('Fichier introuvable.')
    files = files.filter((item) => item.id !== params.fileId)
    return new HttpResponse(null, { status: 204 })
  }),
]
