/**
 * Export CSV des métriques.
 *
 * CSV et non PDF : produire un PDF exige une bibliothèque tierce, et un tableau
 * de chiffres se travaille de toute façon dans un tableur. Le séparateur est le
 * point-virgule et le fichier porte un BOM UTF-8, parce qu'Excel en français
 * ouvre autrement les accents en charabia et coupe tout sur une seule colonne.
 */
const SEPARATOR = ';'

function cell(value: string | number): string {
  const text = String(value)
  // Guillemets, séparateur ou retour à la ligne : la cellule doit être citée.
  return /["\n\r;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(rows: (string | number)[][]): string {
  // Le BOM est écrit en échappement : le caractère brut est invisible dans le
  // fichier source, et se perd au premier outil qui normalise les espaces.
  return `\uFEFF${rows.map((row) => row.map(cell).join(SEPARATOR)).join('\r\n')}\r\n`
}

/**
 * Propose le fichier au téléchargement. L'URL temporaire est révoquée aussitôt
 * après : sans cela chaque export garderait son contenu en mémoire jusqu'au
 * rechargement de la page.
 */
export function downloadCsv(filename: string, rows: (string | number)[][]): void {
  const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
