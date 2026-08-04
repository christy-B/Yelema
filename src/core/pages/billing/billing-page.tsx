import { Download } from 'lucide-react'
import { useEffect, useState } from 'react'

import { downloadInvoicePdf, getBillingPlans, getBillingSummary, listInvoices } from '../../../features/billing/api/api'
import type { BillingPlan, BillingSummary, InvoiceSummary } from '../../../features/billing/api/contracts'
import { Card } from '../../../shared/components/card/card'
import { LoadError } from '../../../shared/components/load-error/load-error'
import { PageBody, PageHeader } from '../../../shared/components/page/page'

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  paid: { label: 'Payée', cls: 'is-paid' },
  issued: { label: 'Émise', cls: 'is-pending' },
  draft: { label: 'Brouillon', cls: 'is-pending' },
}

export function BillingPage() {
  const [summary, setSummary] = useState<BillingSummary | null>(null)
  const [plans, setPlans] = useState<BillingPlan[]>([])
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([])
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    void Promise.all([getBillingSummary(), getBillingPlans(), listInvoices()])
      .then(([data, planItems, items]) => { setSummary(data); setPlans(planItems); setInvoices(items); setStatus('ready') })
      .catch(() => setStatus('error'))
  }, [retryKey])

  const money = (value: number, currency?: string) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currency ?? summary?.currency ?? 'EUR', maximumFractionDigits: 0 }).format(value)
  const download = async (id: string) => { const response = await downloadInvoicePdf(id); const blob = await response.blob(); const url = URL.createObjectURL(blob); window.open(url, '_blank', 'noopener,noreferrer') }
  const maxUsers = plans.find((plan) => plan.key === summary?.planKey)?.limits.maxUsers
  const statusBadge = (value: string) => STATUS_LABELS[value] ?? { label: value, cls: 'is-pending' }

  return (
    <>
      <PageHeader title="Facturation" subtitle="Suivez votre formule et vos factures." />
      <PageBody>
        {status === 'error' && <LoadError onRetry={() => { setStatus('loading'); setRetryKey((key) => key + 1) }} />}
        {status === 'ready' && summary && (
          <div className="billing-stats">
            <Card><small>Formule</small><strong>{summary.plan}</strong><span>{maxUsers ? `Jusqu'à ${maxUsers} membres` : ''}</span></Card>
            {/* Consommation runtime non disponible en v1 (télémétrie à venir). */}
            <Card><small>Consommation du mois</small><strong>{summary.consumption != null ? money(summary.consumption) : '—'}</strong><span className="billing-included">{summary.included != null ? `sur ${money(summary.included)} inclus` : 'Bientôt disponible'}</span></Card>
            <Card><small>Prochaine facture</small><strong>{summary.next ? money(summary.next.amount) : '—'}</strong><span>{summary.next ? `le ${new Intl.DateTimeFormat('fr-FR').format(new Date(summary.next.date))}` : ''}</span></Card>
          </div>
        )}
        {status === 'ready' && <div className="billing-main">
          <Card className="invoice-card">
            <h2>Historique</h2>
            {invoices.length === 0 && <p className="settings-hint">Aucune facture pour le moment.</p>}
            {invoices.map((invoice) => {
              const badge = statusBadge(invoice.status)
              return (
                <div className="invoice-row" key={invoice.id}>
                  <strong>{invoice.reference || invoice.period}</strong>
                  <span>{money(invoice.amount, invoice.currency)}</span>
                  <em className={`invoice-badge ${badge.cls}`}>{badge.label}</em>
                  <button type="button" onClick={() => void download(invoice.id)}><Download size={16} /> PDF</button>
                </div>
              )
            })}
          </Card>
        </div>}
      </PageBody>
    </>
  )
}
