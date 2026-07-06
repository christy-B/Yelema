import { http, HttpResponse } from 'msw'

import type {
  BillingSummary,
  BillingUsageItem,
  InvoiceDetail,
} from '../../billing/contracts'
import billingFixture from '../fixtures/billing.json'
import { API_BASE, notFound, requireAuth } from './helpers'

const summary = billingFixture.summary as BillingSummary
const usage = billingFixture.usage as BillingUsageItem[]
const invoices = billingFixture.invoices as InvoiceDetail[]

export const billingHandlers = [
  http.get(`${API_BASE}/billing/summary`, ({ request }) => {
    const unauthorized = requireAuth(request)
    return unauthorized ?? HttpResponse.json(summary)
  }),

  http.get(`${API_BASE}/billing/usage`, ({ request }) => {
    const unauthorized = requireAuth(request)
    return unauthorized ?? HttpResponse.json(usage)
  }),

  http.get(`${API_BASE}/billing/invoices`, ({ request }) => {
    const unauthorized = requireAuth(request)
    return unauthorized ?? HttpResponse.json(invoices.map((invoice) => ({ id: invoice.id, period: invoice.period, amount: invoice.amount, status: invoice.status })))
  }),

  http.get(`${API_BASE}/billing/invoices/:invoiceId/pdf`, ({ request, params }) => {
    const unauthorized = requireAuth(request)
    if (unauthorized) return unauthorized

    const invoice = invoices.find((item) => item.id === params.invoiceId)
    if (!invoice) return notFound('Facture introuvable.')
    return new HttpResponse('%PDF-1.4\n% Facture simulée Yelema', {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="facture-${invoice.id}.pdf"`,
      },
    })
  }),

  http.get(`${API_BASE}/billing/invoices/:invoiceId`, ({ request, params }) => {
    const unauthorized = requireAuth(request)
    if (unauthorized) return unauthorized

    const invoice = invoices.find((item) => item.id === params.invoiceId)
    return invoice ? HttpResponse.json(invoice) : notFound('Facture introuvable.')
  }),
]
