import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router'

import { Button } from '../../../shared/components/button/button'
import { paths } from '../../routes/paths'

export function ErrorPage() {
  const navigate = useNavigate()
  return <main className="error-page"><span>404</span><h1>Cette page n'existe pas</h1><p>Le lien utilisé est incorrect ou la page a été déplacée.</p><Button leadingIcon={<ArrowLeft size={18} />} onClick={() => navigate(paths.login)}>Retour à la connexion</Button></main>
}
