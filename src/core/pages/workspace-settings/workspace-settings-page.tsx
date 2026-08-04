import { KeyRound, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { getWorkspace, updateWorkspaceLogo, updateWorkspaceSettings } from '../../../features/workspace/api/api'
import { FONT_FAMILIES } from '../../../features/workspace/api/contracts'
import type { Workspace, WorkspaceBranding } from '../../../features/workspace/api/contracts'
import { applyBranding } from '../../../features/workspace/branding'
import { Button } from '../../../shared/components/button/button'
import { Card } from '../../../shared/components/card/card'
import { Input } from '../../../shared/components/input/input'
import { LoadError } from '../../../shared/components/load-error/load-error'
import { PageBody, PageHeader } from '../../../shared/components/page/page'
import { loadProtectedMedia } from '../../../shared/api/client/media'
import { can } from '../../../features/auth/api/permissions'
import { useSession } from '../../../features/auth/providers/session-context'
import { DEFAULT_WORKSPACE_ID, paths } from '../../routes/paths'

const HOSTING_LABELS = { 'cloud-public': 'Cloud public', hybride: 'Hybride', 'on-prem-souverain': 'On-prem souverain' } as const

type ColorField = 'primaryColor' | 'secondaryColor' | 'buttonColor' | 'fontPrimaryColor' | 'fontSecondaryColor'

/** Valeurs par défaut de la charte Yelema — affichées quand le tenant n'a rien personnalisé. */
const DEFAULT_COLORS: Record<ColorField, string> = {
  primaryColor: '#301667',
  secondaryColor: '#8d68fa',
  buttonColor: '#301667',
  fontPrimaryColor: '#0e1220',
  fontSecondaryColor: '#565e72',
}
const COLOR_FIELDS: { key: ColorField; label: string }[] = [
  { key: 'primaryColor', label: 'Couleur primaire' },
  { key: 'secondaryColor', label: 'Couleur secondaire' },
  { key: 'buttonColor', label: 'Couleur des boutons' },
  { key: 'fontPrimaryColor', label: 'Couleur du texte principal' },
  { key: 'fontSecondaryColor', label: 'Couleur du texte secondaire' },
]

// Fournisseurs de clé modèle (BYOK) proposés à l'ajout.
const PROVIDERS = ['OpenAI', 'Anthropic', 'Mistral', 'Google Gemini', 'Azure OpenAI', 'Autre']

/**
 * Clés API / BYOK + restriction de domaine + nom/domaine : encore ABSENTS de
 * l'API v1 (gérés côté back-office plus tard) → simulés en local. Les clés
 * saisies ne sont jamais conservées en clair, seul un aperçu masqué l'est.
 * Le branding (couleurs/police/logo) et les notifications sont RÉELS (API).
 */
interface ApiKey {
  id: string
  provider: string
  name: string
  masked: string
  addedAt: string
}

const SEED_KEYS: ApiKey[] = [
  { id: 'k_1', provider: 'OpenAI', name: 'OpenAI — Production', masked: 'sk-••••••••••••3f9a', addedAt: '12 mai 2026' },
  { id: 'k_2', provider: 'Anthropic', name: 'Anthropic', masked: 'sk-ant-•••••••7c2b', addedAt: '3 juin 2026' },
]

function maskKey(value: string): string {
  const v = value.trim()
  if (v.length <= 8) return '•'.repeat(v.length || 4)
  return `${v.slice(0, 3)}••••••••${v.slice(-4)}`
}

export function WorkspaceSettingsPage() {
  const navigate = useNavigate()
  const { workspaceId = DEFAULT_WORKSPACE_ID } = useParams()
  const { session, refreshSession } = useSession()
  const canEdit = can(session, 'branding', 'edit')

  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [domain, setDomain] = useState('')
  const [restrictDomain, setRestrictDomain] = useState(true)
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(SEED_KEYS)

  const [error, setError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [logoError, setLogoError] = useState('')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const [keyModalOpen, setKeyModalOpen] = useState(false)
  const [keyProvider, setKeyProvider] = useState(PROVIDERS[0])
  const [keyName, setKeyName] = useState('')
  const [keyValue, setKeyValue] = useState('')

  useEffect(() => {
    void getWorkspace()
      .then(async (data) => {
        setWorkspace(data)
        setName(data.name)
        setDomain(session?.workspace.domain ?? '')
        setLogoUrl(await loadProtectedMedia(data.branding.logoUrl))
      })
      .catch(() => setError(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryKey])

  if (error) return <><PageHeader title="Paramètres de l'organisation" subtitle="Identité, apparence, formule et règles d'accès de votre organisation." /><PageBody><LoadError onRetry={() => { setError(false); setRetryKey((key) => key + 1) }} /></PageBody></>
  if (!workspace) return <div className="route-loader">Chargement de l'organisation…</div>

  const setBranding = (patch: Partial<WorkspaceBranding>) => setWorkspace({ ...workspace, branding: { ...workspace.branding, ...patch } })
  const setNotifications = (patch: Partial<Workspace['notifications']>) => setWorkspace({ ...workspace, notifications: { ...workspace.notifications, ...patch } })

  const changeLogo = async (file: File | undefined) => {
    if (!file) return
    setUploadingLogo(true)
    setLogoError('')
    try {
      const { logoUrl: url } = await updateWorkspaceLogo(file)
      setLogoUrl(await loadProtectedMedia(url))
      await refreshSession()
    } catch (reason) {
      setLogoError(reason instanceof Error ? reason.message : 'Téléversement impossible.')
    } finally {
      setUploadingLogo(false)
    }
  }

  // Persiste les parties gérées par l'API réelle : branding (couleurs/police) + notifications.
  const save = async () => {
    setSaving(true)
    setSaveError('')
    try {
      const { logoUrl: _logo, ...branding } = workspace.branding
      void _logo // le logo passe par POST /workspace/logo, jamais par le PATCH
      const updated = await updateWorkspaceSettings({ branding, notifications: workspace.notifications })
      setWorkspace({ ...updated, branding: { ...updated.branding, logoUrl: workspace.branding.logoUrl } })
      applyBranding(updated.branding)
    } catch (reason) {
      setSaveError(reason instanceof Error ? reason.message : 'Enregistrement impossible.')
    } finally {
      setSaving(false)
    }
  }

  const resetTheme = () => setBranding({ primaryColor: null, secondaryColor: null, buttonColor: null, fontPrimaryColor: null, fontSecondaryColor: null, fontFamily: null })

  const addKey = (event: React.FormEvent) => {
    event.preventDefault()
    if (!keyName.trim() || !keyValue.trim()) return
    setApiKeys((keys) => [...keys, {
      id: crypto.randomUUID(),
      provider: keyProvider,
      name: keyName.trim(),
      masked: maskKey(keyValue),
      addedAt: new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()),
    }])
    setKeyModalOpen(false)
    setKeyName(''); setKeyValue(''); setKeyProvider(PROVIDERS[0])
  }

  return (
    <>
      <PageHeader title="Paramètres de l'organisation" subtitle="Identité, apparence, formule et règles d'accès de votre organisation." />
      <PageBody>
        <div className="settings-column">
          {/* Workspace : identité + logo (logo réel ; nom/domaine à persister côté back). */}
          <Card>
            <h2>Organisation</h2>
            <div className="branding-logo-row">
              <span className="workspace-mark workspace-mark--preview">{logoUrl ? <img src={logoUrl} alt="Logo de l'organisation" /> : (name[0] ?? 'O')}</span>
              {canEdit && (
                <>
                  <input ref={logoInputRef} type="file" accept="image/*" hidden onChange={(event) => { void changeLogo(event.target.files?.[0]); event.target.value = '' }} />
                  <Button type="button" variant="tertiary" size="small" disabled={uploadingLogo} onClick={() => logoInputRef.current?.click()}>{uploadingLogo ? 'Téléversement…' : 'Changer le logo'}</Button>
                </>
              )}
            </div>
            {logoError && <p className="form-error" role="alert">{logoError}</p>}
            <div className="settings-grid">
              <Input label="Nom de l'organisation" value={name} disabled={!canEdit} onChange={(event) => setName(event.target.value)} />
              <Input label="Domaine" value={domain} disabled={!canEdit} onChange={(event) => setDomain(event.target.value)} />
              <Input label="Raison sociale" value={workspace.legalName ?? '—'} disabled />
              <Input label="Hébergement" value={HOSTING_LABELS[workspace.hosting]} disabled />
            </div>
          </Card>

          {/* Apparence : branding réel (couleurs + police). */}
          <Card>
            <h2>Apparence</h2>
            <p className="settings-hint">Personnalisez les couleurs et la police de votre espace. Les champs non modifiés suivent le thème Yelema.</p>
            <div className="settings-grid">
              {COLOR_FIELDS.map(({ key, label }) => (
                <label className="field" key={key}><span className="field-label">{label}</span><span className="input-shell input-shell--color"><input type="color" disabled={!canEdit} value={workspace.branding[key] ?? DEFAULT_COLORS[key]} onChange={(event) => setBranding({ [key]: event.target.value })} /><code>{workspace.branding[key] ?? 'Par défaut'}</code></span></label>
              ))}
              <label className="field"><span className="field-label">Police</span><span className="input-shell"><select disabled={!canEdit} value={workspace.branding.fontFamily ?? ''} onChange={(event) => setBranding({ fontFamily: event.target.value || null })}><option value="">Par défaut (Funnel Display)</option>{FONT_FAMILIES.map((font) => <option key={font} value={font}>{font}</option>)}</select></span></label>
            </div>
            {canEdit && <button type="button" className="link-button" onClick={resetTheme}>Revenir au thème par défaut</button>}
          </Card>

          {/* Formule + accès à la facturation. */}
          <Card>
            <div className="settings-row">
              <div>
                <h2>Formule</h2>
                <p className="settings-hint" style={{ margin: '4px 0 0' }}>{workspace.plan} · facturation à l'usage</p>
              </div>
              <Button type="button" variant="tertiary" onClick={() => navigate(paths.billing(workspaceId))}>Gérer la facturation</Button>
            </div>
          </Card>

          {/* Notifications : réel (API). */}
          <Card>
            <h2>Notifications</h2>
            <div className="settings-grid">
              <Input label="Email d'alerte" type="email" disabled={!canEdit} value={workspace.notifications.alertEmail ?? ''} onChange={(event) => setNotifications({ alertEmail: event.target.value })} />
              <label className="field"><span className="field-label">Fréquence du digest</span><span className="input-shell"><select disabled={!canEdit} value={workspace.notifications.digestFrequency ?? 'weekly'} onChange={(event) => setNotifications({ digestFrequency: event.target.value as Workspace['notifications']['digestFrequency'] })}><option value="daily">Quotidien</option><option value="weekly">Hebdomadaire</option><option value="none">Aucun</option></select></span></label>
            </div>
          </Card>

          {/* Restriction d'invitation au domaine (mock en attendant le back). */}
          <Card>
            <button type="button" className="setting-toggle" disabled={!canEdit} onClick={() => setRestrictDomain((value) => !value)}>
              <span><strong>Limiter les invitations au domaine {domain}</strong><small>Seules les adresses de ce domaine pourront être invitées.</small></span>
              <i className={restrictDomain ? 'switch is-on' : 'switch'} aria-label={restrictDomain ? 'Activé' : 'Désactivé'}><b /></i>
            </button>
          </Card>

          {/* Clés API / BYOK (mock en attendant le back). */}
          <Card>
            <div className="settings-row">
              <div>
                <h2>Clés API</h2>
                <p className="settings-hint" style={{ margin: '4px 0 0' }}>Enregistrez la clé modèle de votre fournisseur pour l'utiliser dans le workspace.</p>
              </div>
              {canEdit && <Button type="button" leadingIcon={<Plus size={16} />} onClick={() => setKeyModalOpen(true)}>Ajouter une clé</Button>}
            </div>
            <div className="api-key-list">
              {apiKeys.length === 0 && <p className="settings-hint">Aucune clé enregistrée.</p>}
              {apiKeys.map((key) => (
                <div key={key.id} className="api-key-row">
                  <span className="api-key-icon"><KeyRound size={17} /></span>
                  <div className="api-key-id"><strong>{key.name}</strong><code>{key.masked}</code></div>
                  <span className="api-key-date">Ajoutée le {key.addedAt}</span>
                  {canEdit && <button type="button" className="api-key-delete" aria-label={`Supprimer ${key.name}`} onClick={() => setApiKeys((keys) => keys.filter((k) => k.id !== key.id))}><Trash2 size={16} /></button>}
                </div>
              ))}
            </div>
          </Card>

          {canEdit && (
            <div className="settings-actions">
              {saveError && <p className="form-error" role="alert">{saveError}</p>}
              <Button type="button" disabled={saving} onClick={() => void save()}>{saving ? 'Enregistrement…' : 'Enregistrer les modifications'}</Button>
            </div>
          )}
        </div>
      </PageBody>

      {keyModalOpen && (
        <div className="modal-overlay" onClick={() => setKeyModalOpen(false)}>
          <form className="modal-card" onClick={(event) => event.stopPropagation()} onSubmit={addKey}>
            <div className="modal-head"><h2>Ajouter une clé API</h2><button type="button" className="modal-close" onClick={() => setKeyModalOpen(false)} aria-label="Fermer"><X size={18} /></button></div>
            <p className="modal-intro">Enregistrez la clé de votre fournisseur pour l'utiliser dans le workspace. Elle est stockée de façon sécurisée et masquée.</p>
            <label className="field"><span className="field-label">Fournisseur</span><span className="input-shell"><select value={keyProvider} onChange={(event) => setKeyProvider(event.target.value)}>{PROVIDERS.map((provider) => <option key={provider} value={provider}>{provider}</option>)}</select></span></label>
            <Input label="Nom · pour vous repérer" value={keyName} onChange={(event) => setKeyName(event.target.value)} placeholder="Ex. OpenAI — Production" required autoFocus />
            <Input label="Clé API" value={keyValue} onChange={(event) => setKeyValue(event.target.value)} placeholder="sk-…" required />
            <div className="modal-actions">
              <Button type="button" variant="tertiary" onClick={() => setKeyModalOpen(false)}>Annuler</Button>
              <Button type="submit" leadingIcon={<Plus size={16} />}>Ajouter la clé</Button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
