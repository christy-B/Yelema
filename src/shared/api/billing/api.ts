import { apiFetch, apiRequest } from '../client/http-client'
import type {
  BillingSummary,
  BillingUsageItem,
  InvoiceDetail,
  InvoiceSummary,
} from './contracts'

export function getBillingSummary(): Promise<BillingSummary> {
  return apiRequest('/billing/summary')
}

export function getBillingUsage(): Promise<BillingUsageItem[]> {
  return apiRequest('/billing/usage')
}

export function listInvoices(): Promise<InvoiceSummary[]> {
  return apiRequest('/billing/invoices')
}

export function getInvoice(invoiceId: string): Promise<InvoiceDetail> {
  return apiRequest(`/billing/invoices/${invoiceId}`)
}

export function downloadInvoicePdf(invoiceId: string): Promise<Response> {
  return apiFetch(`/billing/invoices/${invoiceId}/pdf`)
}
