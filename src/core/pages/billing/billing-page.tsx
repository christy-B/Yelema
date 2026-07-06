import { Download } from 'lucide-react'
import { useEffect, useState } from 'react'

import { downloadInvoicePdf, getBillingSummary, getBillingUsage, listInvoices } from '../../../shared/api/billing/api'
import type { BillingSummary, BillingUsageItem, InvoiceSummary } from '../../../shared/api/billing/contracts'
import { Card } from '../../../shared/components/card/card'
import { LoadError } from '../../../shared/components/load-error/load-error'
import { PageBody, PageHeader } from '../../../shared/components/page/page'

export function BillingPage() {
  const [summary, setSummary] = useState<BillingSummary | null>(null)
  const [usage, setUsage] = useState<BillingUsageItem[]>([])
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([])
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    void Promise.all([getBillingSummary(), getBillingUsage(), listInvoices()])
      .then(([data, usageItems, items]) => { setSummary(data); setUsage(usageItems); setInvoices(items); setStatus('ready') })
      .catch(() => setStatus('error'))
  }, [retryKey])

  const money = (value: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: summary?.currency ?? 'USD', maximumFractionDigits: 0 }).format(value)
  const download = async (id: string) => { const response = await downloadInvoicePdf(id); const blob = await response.blob(); const url = URL.createObjectURL(blob); window.open(url, '_blank', 'noopener,noreferrer') }

  return (
    <>
      <PageHeader title="Facturation" subtitle="Suivez la consommation IA et vos factures en temps réel." />
      <PageBody>
        {status === 'error' && <LoadError onRetry={() => { setStatus('loading'); setRetryKey((key) => key + 1) }} />}
        {status === 'ready' && summary && (
          <div className="billing-stats">
            <Card><small>Formule</small><strong>{summary.plan}</strong><span>Jusqu'à 25 membres</span></Card>
            <Card><small>Consommation du mois</small><strong>{money(summary.consumption)}</strong><span className="billing-included">sur {money(summary.included)} inclus</span></Card>
            <Card><small>Prochaine facture</small><strong>{money(summary.next.amount)}</strong><span>le {new Intl.DateTimeFormat('fr-FR').format(new Date(summary.next.date))}</span></Card>
          </div>
        )}
        {status === 'ready' && <div className="billing-main">
          <Card className="usage-card">
            <div className="usage-head"><h2>Répartition par modèle</h2><span>Coût IA estimé ce mois · {money(summary?.consumption ?? 0)}</span></div>
            {usage.map((item) => (
              <div key={item.model} className="usage-row">
                <div className="usage-line"><span>{item.model}</span><strong>{money(item.cost)} · {item.pct}%</strong></div>
                <span className="usage-bar"><span style={{ width: `${item.pct}%` }} /></span>
              </div>
            ))}
            <p className="usage-tip">Basculer les tâches simples vers <strong>Haiku</strong> réduirait le coût d'environ 24 %.</p>
          </Card>
          <Card className="invoice-card">
            <h2>Historique</h2>
            {invoices.map((invoice) => (
              <div className="invoice-row" key={invoice.id}>
                <strong>{invoice.period}</strong>
                <span>{money(invoice.amount)}</span>
                <em className={invoice.status === 'paid' ? 'invoice-badge is-paid' : 'invoice-badge is-pending'}>{invoice.status === 'paid' ? 'Payée' : 'En cours'}</em>
                <button type="button" onClick={() => void download(invoice.id)}><Download size={16} /> PDF</button>
              </div>
            ))}
          </Card>
        </div>}
      </PageBody>
    </>
  )
}
