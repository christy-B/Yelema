import { apiFetch, apiRequest } from '../../../shared/api/client/http-client'
import type {
  BillingPlan,
  BillingSummary,
  InvoiceDetail,
  InvoiceSummary,
} from './contracts'

/** Formes RÉELLES de l'API billing (control-plane, v1). */
interface RealSummary {
  plan: { key: string; name: string } | null
  currency: string | null
  next: { amount: number; date: string | null } | null
  consumption: number | null
  included: number | null
}

interface RealInvoiceItem {
  id: string
  reference: string
  period: string
  status: string
  amountTTC: number | null
  currency: string
  issuedAt: string | null
}

interface RealInvoiceDetail extends RealInvoiceItem {
  amountHT: number | null
  lineItems: { label: string; quantity: number | null; unitAmount: number | null; amount: number | null }[]
  tax: { scheme: string; rate: number | null; amount: number | null } | null
}

interface Paginated<T> {
  items: T[]
}

function toInvoiceSummary(real: RealInvoiceItem): InvoiceSummary {
  return {
    id: real.id,
    reference: real.reference,
    period: real.period,
    amount: real.amountTTC ?? 0,
    currency: real.currency,
    status: real.status,
  }
}

export async function getBillingSummary(): Promise<BillingSummary> {
  const real = await apiRequest<RealSummary>('/billing/summary')
  return {
    plan: real.plan?.name ?? '—',
    planKey: real.plan?.key ?? '',
    currency: real.currency ?? 'EUR',
    consumption: real.consumption,
    included: real.included,
    next: real.next?.date ? { amount: real.next.amount, date: real.next.date } : null,
  }
}

export function getBillingPlans(): Promise<BillingPlan[]> {
  return apiRequest('/billing/plans')
}

export async function listInvoices(): Promise<InvoiceSummary[]> {
  const envelope = await apiRequest<Paginated<RealInvoiceItem>>('/billing/invoices?skip=0&limit=100')
  return envelope.items.map(toInvoiceSummary)
}

export async function getInvoice(invoiceId: string): Promise<InvoiceDetail> {
  const real = await apiRequest<RealInvoiceDetail>(`/billing/invoices/${invoiceId}`)
  return {
    ...toInvoiceSummary(real),
    amountHT: real.amountHT,
    lines: real.lineItems.map((line) => ({
      label: line.label,
      detail: line.quantity != null && line.unitAmount != null ? `${line.quantity} × ${line.unitAmount}` : undefined,
      amount: line.amount ?? 0,
    })),
    tax: real.tax?.rate != null ? { scheme: real.tax.scheme, rate: real.tax.rate, amount: real.tax.amount ?? 0 } : null,
  }
}

/** Le back répond soit un flux PDF, soit un 302 vers une URL présignée (suivie par fetch). */
export function downloadInvoicePdf(invoiceId: string): Promise<Response> {
  return apiFetch(`/billing/invoices/${invoiceId}/pdf`)
}
