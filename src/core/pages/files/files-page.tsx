import { FileText, MoreHorizontal, Plus, Search, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { deleteFile, getStorageSummary, listFiles, uploadFiles } from '../../../shared/api/files/api'
import type { FileItem, StorageSummary } from '../../../shared/api/files/contracts'
import { Input } from '../../../shared/components/input/input'
import { LoadError } from '../../../shared/components/load-error/load-error'
import { PageBody, PageHeader } from '../../../shared/components/page/page'

export function FilesPage() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [storage, setStorage] = useState<StorageSummary | null>(null)
  const [query, setQuery] = useState('')
  const [menuId, setMenuId] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')
  const [retryKey, setRetryKey] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = async () => { const [items, summary] = await Promise.all([listFiles(query), getStorageSummary()]); setFiles(items); setStorage(summary) }
  useEffect(() => {
    void Promise.all([listFiles(query), getStorageSummary()])
      .then(([items, summary]) => { setFiles(items); setStorage(summary); setStatus('ready') })
      .catch(() => setStatus('error'))
  }, [query, retryKey])
  const addFiles = async (items: File[]) => { if (items.length) { await uploadFiles(items); await load() } }
  const remove = async (id: string) => { setMenuId(null); await deleteFile(id); await load() }

  const storageWidget = storage && (
    <div className="storage-card">
      <div><span>{storage.count} fichiers · {storage.used}</span><small>/ {storage.quota}</small></div>
      <div><span style={{ width: `${storage.percent}%` }} /></div>
    </div>
  )

  return (
    <>
      <PageHeader title="Fichiers" subtitle="Tous les documents partagés avec vos agents, au même endroit." action={storageWidget} />
      <PageBody>
        <div className="files-toolbar">
          <Input className="list-search" aria-label="Rechercher un fichier" placeholder="Rechercher un fichier…" value={query} onChange={(event) => setQuery(event.target.value)} icon={<Search size={17} />} />
          <button type="button" className="files-import" onClick={() => inputRef.current?.click()}><Plus size={17} /> Importer</button>
          <input ref={inputRef} type="file" multiple hidden onChange={(event) => { if (event.target.files) void addFiles(Array.from(event.target.files)); event.target.value = '' }} />
        </div>
        {status === 'error' && <LoadError onRetry={() => { setStatus('loading'); setRetryKey((key) => key + 1) }} />}
        {status !== 'error' && <><div className="files-count">{query ? `${files.length} fichier${files.length > 1 ? 's' : ''} correspondent à votre recherche` : `${files.length} fichiers`}</div>
        <div className="files-table">
          <div className="files-head"><span /><span>Nom</span><span>Agent associé</span><span>Taille</span><span>Ajouté le</span><span /></div>
          {files.length === 0 ? (
            <div className="files-empty">Aucun fichier ne correspond à « {query} ».</div>
          ) : files.map((file) => (
            <div key={file.id} className="files-row">
              <span className="file-icon"><FileText size={18} /></span>
              <div className="file-name"><strong>{file.name}</strong><small>{file.kind}</small></div>
              <span className="file-agent">{file.agent}</span>
              <span className="file-size">{file.size}</span>
              <span className="file-date">{file.date}</span>
              <div className="file-actions">
                <button type="button" aria-label="Plus d'actions" onClick={() => setMenuId(menuId === file.id ? null : file.id)}><MoreHorizontal size={18} /></button>
                {menuId === file.id && (
                  <div className="row-menu"><button type="button" className="row-menu-danger" onClick={() => void remove(file.id)}><Trash2 size={15} /> Supprimer</button></div>
                )}
              </div>
            </div>
          ))}
        </div></>}
      </PageBody>
    </>
  )
}
