import { Check, Sparkles, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { listMetiers, requestCustomExpert } from '../../../features/agents/api/api'
import { Button } from '../button/button'

/**
 * Nature des données que l'expert devra exploiter. Liste fermée : c'est ce qui
 * détermine la faisabilité — un expert qui lit des tableurs et un expert qui
 * interroge une base de données ne se construisent pas de la même façon.
 */
const DATA_KINDS = [
  'Documents (PDF, Word…)',
  'Tableurs',
  'Courriels',
  'Messages (WhatsApp, Telegram…)',
  'Base de données',
  'Logiciel métier / API',
  'Images et scans',
  'Audio',
]

interface CustomExpertModalProps {
  /** Reprend ce que l'utilisateur avait déjà écrit dans la barre de besoin. */
  initialNeed?: string
  onClose: () => void
}

/**
 * Commander un expert que le catalogue ne propose pas.
 *
 * Ce n'est PAS un recrutement : rien ne rejoint l'équipe et rien n'est facturé.
 * La demande part au cadrage — et le cadrage a besoin de trois choses : le
 * besoin, le métier, et la nature des données que l'expert devra exploiter.
 * Sans elles la demande n'est qu'un vœu, et le premier échange avec le client
 * consiste à redemander ce qu'on aurait pu saisir ici.
 */
export function CustomExpertModal({ initialNeed = '', onClose }: CustomExpertModalProps) {
  const [need, setNeed] = useState(initialNeed)
  const [metier, setMetier] = useState('')
  const [kinds, setKinds] = useState<string[]>([])
  const [metiers, setMetiers] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let current = true
    // Les métiers déjà connus alimentent la saisie assistée du champ « métier ».
    void listMetiers()
      .then((groups) => { if (current) setMetiers(groups.map((item) => item.name)) })
      .catch(() => undefined)
    return () => { current = false }
  }, [])

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value]

  const complet = need.trim().length > 0 && metier.trim().length > 0 && kinds.length > 0

  const submit = async () => {
    if (sending || !complet) return
    setSending(true)
    setError('')
    try {
      await requestCustomExpert({ need: need.trim(), metier: metier.trim(), dataKinds: kinds })
      setSent(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'La demande n’a pas pu être envoyée.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card--lg" role="dialog" aria-modal="true" aria-label="Commander un expert sur mesure" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <h2>{sent ? 'Demande enregistrée' : 'Commander un expert sur mesure'}</h2>
          <button type="button" className="modal-close" aria-label="Fermer" onClick={onClose}><X size={17} /></button>
        </div>

        {sent ? (
          <>
            <p className="modal-intro">
              Votre demande est transmise. Un cadrage vous sera proposé avant toute création :
              rien n’a rejoint votre équipe et rien ne vous a été facturé.
            </p>
            <div className="modal-actions"><Button onClick={onClose}>Fermer</Button></div>
          </>
        ) : (
          <>
            <p className="modal-intro">
              Décrivez le métier qui vous manque et les données sur lesquelles il travaillera.
              Nous revenons vers vous pour le cadrer — ce n’est pas un recrutement immédiat.
            </p>

            <label className="cx-field">
              <span>Le besoin</span>
              <textarea
                rows={3}
                value={need}
                autoFocus
                placeholder="Ex. : suivre les impayés, relancer les débiteurs et préparer les dossiers de contentieux…"
                onChange={(event) => setNeed(event.target.value)}
              />
            </label>

            <label className="cx-field">
              <span>Le métier</span>
              <input
                value={metier}
                list="cx-metiers"
                placeholder="Recouvrement, Logistique, Conformité…"
                onChange={(event) => setMetier(event.target.value)}
              />
              <datalist id="cx-metiers">
                {metiers.map((item) => <option key={item} value={item} />)}
              </datalist>
            </label>

            <div className="cx-field">
              <span>Sur quelles données travaillera-t-il ?</span>
              {/* Une liste a cocher, pas des pastilles : c'est un choix de
                  formulaire, il n'a aucune raison de ressembler a des cartes. */}
              <div className="cx-picks" role="group" aria-label="Nature des données">
                {DATA_KINDS.map((kind) => {
                  const on = kinds.includes(kind)
                  return (
                    <button type="button" key={kind} role="checkbox" aria-checked={on} className={on ? 'cx-pick is-on' : 'cx-pick'} onClick={() => setKinds((list) => toggle(list, kind))}>
                      <span className="cx-pick-box">{on && <Check size={11} strokeWidth={3} />}</span>
                      {kind}
                    </button>
                  )
                })}
              </div>
            </div>

            {error && <p className="cx-error" role="alert">{error}</p>}

            <div className="modal-actions">
              <Button variant="tertiary" onClick={onClose}>Annuler</Button>
              <Button leadingIcon={<Sparkles size={16} />} onClick={() => void submit()} disabled={sending || !complet}>
                {sending ? 'Envoi…' : 'Envoyer la demande'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
