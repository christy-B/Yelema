import { Accessibility, Armchair, Briefcase, Crown, FileText, Footprints, Gem, Glasses, HardHat, Headphones, IdCard, ImagePlus, Laptop, Loader2, PersonStanding, Presentation, Shirt, Smartphone, Sparkles, Tablet, User, UserRound, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'

import { getPortraitJob, requestPortrait } from '../../../features/agents/api/api'
import { generatePortraits } from '../../../features/agents/api/portrait-generation'
import type {
  AgentAvatarConfig, AgentDetail, AgentPortrait, AvatarAccessory, AvatarBackground,
  AvatarPosition, AvatarStyle, PortraitVariant,
} from '../../../features/agents/api/contracts'
import {
  AVATAR_ACCESSORY_LABELS, AVATAR_BACKGROUND_COLORS, AVATAR_BACKGROUND_LABELS,
  AVATAR_POSITION_LABELS, AVATAR_STYLE_LABELS,
} from '../../../features/agents/api/contracts'
import { AgentAvatar } from '../agent-avatar/agent-avatar'
import { Button } from '../button/button'

interface AvatarConfigModalProps {
  agent: AgentDetail
  value: AgentAvatarConfig
  portrait: AgentPortrait | null
  onClose: () => void
  onSave: (config: AgentAvatarConfig, portrait: AgentPortrait | null) => Promise<void> | void
}

interface Option<T extends string> { key: T; icon: ReactNode }

const POSITIONS: Option<AvatarPosition>[] = [
  { key: 'auto', icon: <Sparkles size={15} /> },
  { key: 'face', icon: <User size={15} /> },
  { key: 'trois-quarts', icon: <UserRound size={15} /> },
  { key: 'profil', icon: <PersonStanding size={15} /> },
  { key: 'bras-croises', icon: <Accessibility size={15} /> },
  { key: 'assis', icon: <Armchair size={15} /> },
  { key: 'marche', icon: <Footprints size={15} /> },
  { key: 'reunion', icon: <Presentation size={15} /> },
]
const STYLES: Option<AvatarStyle>[] = [
  { key: 'auto', icon: <Sparkles size={15} /> },
  { key: 'casual', icon: <Shirt size={15} /> },
  { key: 'smart-casual', icon: <Shirt size={15} /> },
  { key: 'blazer', icon: <Shirt size={15} /> },
  { key: 'business', icon: <Briefcase size={15} /> },
  { key: 'traditionnel', icon: <Gem size={15} /> },
  { key: 'terrain', icon: <HardHat size={15} /> },
  { key: 'ceremonie', icon: <Crown size={15} /> },
]
const ACCESSORIES: Option<AvatarAccessory>[] = [
  { key: 'auto', icon: <Sparkles size={15} /> },
  { key: 'aucun', icon: <User size={15} /> },
  { key: 'casque', icon: <Headphones size={15} /> },
  { key: 'ordinateur', icon: <Laptop size={15} /> },
  { key: 'tablette', icon: <Tablet size={15} /> },
  { key: 'telephone', icon: <Smartphone size={15} /> },
  { key: 'documents', icon: <FileText size={15} /> },
  { key: 'badge', icon: <IdCard size={15} /> },
  { key: 'lunettes', icon: <Glasses size={15} /> },
]
const BACKGROUNDS: AvatarBackground[] = ['auto', 'blanc', 'beige', 'gris', 'violet', 'bleu', 'vert', 'fonce']

/** Cadrage à l'affichage. `entier` = l'image est montrée telle qu'elle a été produite. */
const CROP_POSITION: Record<PortraitVariant['crop'], string> = {
  entier: 'center', serre: 'center 6%', buste: 'center 12%', plein: 'center 30%',
}

/**
 * Portrait d'un expert : l'organisation compose quatre axes, la génération part
 * avec une image de référence, et rend UN portrait — visible directement dans
 * l'aperçu. « Relancer » en produit un autre.
 */
export function AvatarConfigModal({ agent, value, portrait, onClose, onSave }: AvatarConfigModalProps) {
  const [draft, setDraft] = useState<AgentAvatarConfig>(value)
  const [phase, setPhase] = useState<'compose' | 'generating' | 'ready' | 'failed'>('compose')
  /** Portrait produit par la dernière génération. Un seul : il n'y a rien à choisir. */
  const [generated, setGenerated] = useState<PortraitVariant | null>(null)
  const [saving, setSaving] = useState(false)
  // Message de l'API quand la génération échoue : il est exploitable, on l'affiche.
  const [error, setError] = useState<string | null>(null)
  // Image de référence fournie par l'organisation. À défaut, le portrait courant.
  const [reference, setReference] = useState<File | null>(null)
  const [referenceUrl, setReferenceUrl] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  /** Aperçu local du fichier choisi ; l'URL temporaire est libérée au remplacement. */
  const pickReference = (file: File | null) => {
    setReferenceUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous)
      return file ? URL.createObjectURL(file) : null
    })
    setReference(file)
    // Une nouvelle référence rend le portrait produit obsolète.
    setGenerated(null)
    setPhase('compose')
  }

  const patch = (part: Partial<AgentAvatarConfig>) => {
    setDraft((prev) => ({ ...prev, ...part }))
    if (phase === 'ready') { setPhase('compose'); setGenerated(null) }
  }

  const generate = async () => {
    setPhase('generating')
    setError(null)

    // Génération réelle quand le serveur relaie OpenAI.
    // `null` = pas de clé configurée, on passe à la simulation.
    const source = reference ?? agent.avatarUrl
    if (source) {
      try {
        const produced = await generatePortraits(source, draft)
        if (produced && produced.length > 0) {
          setGenerated(produced[0])
          setPhase('ready')
          return
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : null)
        setPhase('failed')
        return
      }
    }

    // Sans clé : le travail simulé, qui tient le même contrat.
    const job = await requestPortrait(agent.id, draft).catch(() => null)
    if (!job) { setPhase('failed'); return }

    const poll = () => {
      timer.current = window.setTimeout(() => {
        void getPortraitJob(agent.id, job.id)
          .then((state) => {
            if (state.status === 'pending') { poll(); return }
            if (state.status === 'ready' && state.variants.length > 0) {
              setGenerated(state.variants[0])
              setPhase('ready')
            } else {
              setPhase('failed')
            }
          })
          .catch(() => setPhase('failed'))
      }, 700)
    }
    poll()
  }

  const save = async () => {
    setSaving(true)
    try {
      await onSave(draft, generated ? { url: generated.url, crop: generated.crop } : portrait)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const axis = <T extends string>(label: string, options: Option<T>[], current: T, labels: Record<T, string>, apply: (key: T) => void) => (
    <div className="av-axis">
      <span className="av-axis-label">{label}</span>
      <div className="av-grid" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <button
            type="button"
            key={option.key}
            role="radio"
            aria-checked={current === option.key}
            className={current === option.key ? 'av-opt is-on' : 'av-opt'}
            onClick={() => apply(option.key)}
          >
            {option.icon}
            <span>{labels[option.key]}</span>
          </button>
        ))}
      </div>
    </div>
  )

  const shownCrop = generated?.crop ?? portrait?.crop ?? 'buste'
  /**
   * Une image produite par le modèle contient déjà son fond. Peindre la couleur
   * de l'axe derrière elle ferait apparaître deux fonds : le cadre reste neutre.
   */
  const frameBackground = (generated?.url ?? portrait?.url)
    ? undefined
    : AVATAR_BACKGROUND_COLORS[draft.background]

  return (
    <div className="picker-overlay" role="dialog" aria-modal="true" aria-label={`Portrait de ${agent.name}`} onClick={onClose}>
      <div className="av-modal" onClick={(event) => event.stopPropagation()}>
        <div className="picker-head">
          <h3>Portrait de {agent.name}</h3>
          <button type="button" className="picker-close" aria-label="Fermer" onClick={onClose}><X size={17} /></button>
        </div>

        <div className="av-body">
          <div className="av-preview">
            <div className="av-frame" style={{ background: frameBackground }}>
              <AgentAvatar
                id={agent.id}
                name={agent.name}
                avatarUrl={generated?.url ?? referenceUrl ?? portrait?.url ?? agent.avatarUrl}
                className={[
                  'av-photo',
                  phase === 'generating' ? 'is-working' : '',
                  shownCrop === 'entier' ? 'is-whole' : '',
                ].filter(Boolean).join(' ')}
                style={{ objectPosition: CROP_POSITION[shownCrop] }}
              />
              {/* L'attente se dit par un mouvement, pas par un compte à rebours. */}
              {phase === 'generating' && (
                <span className="av-spinner" role="status" aria-label="Génération en cours">
                  <Loader2 size={26} />
                </span>
              )}
            </div>

            {/* Le portrait est produit à partir de cette image : celle fournie ici,
                ou à défaut le portrait courant de l'expert. */}
            <div className="av-source">
              <label className="av-source-pick">
                <ImagePlus size={15} />
                <span>{reference ? reference.name : 'Choisir une image de référence'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  hidden
                  onChange={(event) => pickReference(event.target.files?.[0] ?? null)}
                />
              </label>
              {/* Retour au portrait par défaut : une croix sur l'étiquette du fichier,
                  plutôt qu'une ligne de plus sous l'aperçu. */}
              {reference && (
                <button
                  type="button"
                  className="av-source-drop"
                  aria-label="Revenir au portrait par défaut"
                  title="Revenir au portrait par défaut"
                  onClick={() => pickReference(null)}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {phase === 'failed' && (
              <p className="av-status is-failed">{error ?? 'La génération a échoué. Relancez-la.'}</p>
            )}
          </div>

          <div className="av-axes">
            {axis('Position', POSITIONS, draft.position, AVATAR_POSITION_LABELS, (key) => patch({ position: key }))}
            {axis('Tenue', STYLES, draft.style, AVATAR_STYLE_LABELS, (key) => patch({ style: key }))}
            {axis('Accessoire', ACCESSORIES, draft.accessory, AVATAR_ACCESSORY_LABELS, (key) => patch({ accessory: key }))}

            <div className="av-axis">
              <span className="av-axis-label">Fond</span>
              <div className="av-grid" role="radiogroup" aria-label="Fond">
                {BACKGROUNDS.map((option) => (
                  <button
                    type="button"
                    key={option}
                    role="radio"
                    aria-checked={draft.background === option}
                    className={draft.background === option ? 'av-opt is-on' : 'av-opt'}
                    onClick={() => patch({ background: option })}
                  >
                    <span className="av-swatch" style={{ background: AVATAR_BACKGROUND_COLORS[option] }} />
                    <span>{AVATAR_BACKGROUND_LABELS[option]}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="av-foot">
          <Button variant="tertiary" onClick={onClose}>Annuler</Button>
          <Button
            variant="tertiary"
            leadingIcon={<Sparkles size={15} />}
            onClick={() => void generate()}
            disabled={phase === 'generating'}
          >
            {phase === 'ready' ? 'Relancer' : 'Générer'}
          </Button>
          <Button onClick={() => void save()} disabled={saving || phase === 'generating'}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </div>
  )
}
