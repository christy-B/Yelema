import { Upload } from 'lucide-react'
import type { ChangeEvent, DragEvent } from 'react'

interface FileDropZoneProps { onFiles: (files: File[]) => void; compact?: boolean }

export function FileDropZone({ onFiles, compact = false }: FileDropZoneProps) {
  const receive = (files: FileList | null) => { if (files?.length) onFiles(Array.from(files)) }
  const handleDrop = (event: DragEvent<HTMLLabelElement>) => { event.preventDefault(); receive(event.dataTransfer.files) }
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => receive(event.target.files)
  return (
    <label className={`file-drop-zone${compact ? ' file-drop-zone--compact' : ''}`} onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
      <Upload aria-hidden="true" size={28} strokeWidth={1.8} />
      <span>Glissez un document<br />pour enrichir le contexte</span>
      <input type="file" multiple onChange={handleChange} />
    </label>
  )
}
