import { apiFetch, apiRequest } from '../client/http-client'
import type { FileItem, StorageSummary } from './contracts'

export function listFiles(q?: string): Promise<FileItem[]> {
  return apiRequest(`/files${q ? `?q=${encodeURIComponent(q)}` : ''}`)
}

export function getFile(fileId: string): Promise<FileItem> {
  return apiRequest(`/files/${fileId}`)
}

export function uploadFiles(files: File[]): Promise<FileItem[]> {
  const body = new FormData()
  files.forEach((file) => body.append('file', file))
  return apiRequest('/files', { method: 'POST', body })
}

export async function getFileDownloadUrl(fileId: string): Promise<string> {
  const response = await apiFetch(`/files/${fileId}/download`)
  return response.url
}

export function deleteFile(fileId: string): Promise<void> {
  return apiRequest(`/files/${fileId}`, { method: 'DELETE' })
}

export function getStorageSummary(): Promise<StorageSummary> {
  return apiRequest('/files/storage')
}
