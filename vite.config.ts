import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Préfixe vide : loadEnv rend aussi les variables non préfixées. Elles sont
  // lues ici, côté serveur de développement, et ne partent jamais dans le
  // paquet livré au navigateur.
  const env = loadEnv(mode, process.cwd(), '')
  const openaiKey = env.OPENAI_API_KEY

  return {
    // Déploiement sous-chemin (ex. GitHub Pages : /Yelema/) via VITE_BASE_PATH.
    base: env.VITE_BASE_PATH ?? '/',
    plugins: [react()],
    server: {
      proxy: {
        // Génération des portraits d'Experts, pour les essais en local. Le
        // navigateur appelle /openai/v1/… sur sa propre origine ; le proxy pose
        // l'autorisation et relaie vers OpenAI. La clé ne quitte pas le serveur.
        //
        // Ce relais n'existe QUE sur le serveur de développement : un build
        // statique n'en a aucune trace, donc le site publié ne peut pas porter
        // la clé — la génération y retombe d'elle-même sur la simulation.
        ...(openaiKey
          ? {
              '/openai': {
                target: 'https://api.openai.com',
                changeOrigin: true,
                rewrite: (path: string) => path.replace(/^\/openai/, ''),
                headers: { Authorization: `Bearer ${openaiKey}` },
              },
            }
          : {}),
      },
    },
  }
})
