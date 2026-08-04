/**
 * Logos des connecteurs / canaux (assets/connectors/*.svg), résolus en URLs par
 * Vite et indexés par clé de provider (nom de fichier sans extension). Partagé
 * par la fiche expert (connecteurs branchés) et le rail expert (canaux).
 */
export const CONNECTOR_LOGOS: Record<string, string> = Object.fromEntries(
  Object.entries(import.meta.glob('../../assets/connectors/*.{svg,png,webp}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>)
    .map(([path, url]) => [path.split('/').pop()!.replace(/\.\w+$/, ''), url]),
)
