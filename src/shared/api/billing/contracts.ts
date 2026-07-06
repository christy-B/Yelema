export interface BillingSummary {
  plan: string
  consumption: number
  included: number
  currency: string
  next: { amount: number; date: string }
}

export interface BillingUsageItem {
  model: string
  cost: number
  pct: number
}

export interface InvoiceSummary {
  id: string
  period: string
  amount: number
  status: 'paid' | 'pending'
}

export interface InvoiceDetail extends InvoiceSummary {
  lines: { label: string; detail?: string; amount: number }[]
}
