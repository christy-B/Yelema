export interface BillingSummary {
  plan: string
  planKey: string
  currency: string
  /** Consommation du mois — null tant que la télémétrie runtime n'est pas branchée (v1). */
  consumption: number | null
  included: number | null
  next: { amount: number; date: string } | null
}

export interface BillingPlan {
  key: string
  name: string
  priceMonthly: number
  currency: string
  limits: { maxUsers: number | null; maxTools: number | null }
}

/** Statuts connus : draft | issued | paid — enum ouverte côté back, coder défensif. */
export type InvoiceStatus = string

export interface InvoiceSummary {
  id: string
  reference: string
  period: string
  amount: number
  currency: string
  status: InvoiceStatus
}

export interface InvoiceDetail extends InvoiceSummary {
  amountHT: number | null
  lines: { label: string; detail?: string; amount: number }[]
  tax: { scheme: string; rate: number; amount: number } | null
}
