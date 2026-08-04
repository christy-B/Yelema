import { http, HttpResponse } from 'msw'

import { INVOICES, PLANS, SUMMARY } from './demo-store'
import { API_BASE, notFound, requireAuth } from './helpers'

/**
 * Facturation, aux formes de l'API v1 : résumé d'abonnement, catalogue de plans,
 * factures dans une enveloppe paginée, et détail d'une facture avec ses lignes.
 */
export const billingHandlers = [
  http.get(`${API_BASE}/billing/summary`, ({ request }) => {
    return requireAuth(request) ?? HttpResponse.json(SUMMARY)
  }),

  http.get(`${API_BASE}/billing/plans`, ({ request }) => {
    return requireAuth(request) ?? HttpResponse.json(PLANS)
  }),

  // Déclaré avant /billing/invoices/:id pour ne pas être capté par le paramètre.
  http.get(`${API_BASE}/billing/invoices`, ({ request }) => {
    const unauthorized = requireAuth(request)
    if (unauthorized) return unauthorized
    // La liste ne porte que le résumé : le détail (lignes, TVA, montant HT) est
    // servi par la route de la facture.
    return HttpResponse.json({
      items: INVOICES.map((invoice) => ({
        id: invoice.id,
        reference: invoice.reference,
        period: invoice.period,
        status: invoice.status,
        amountTTC: invoice.amountTTC,
        currency: invoice.currency,
        issuedAt: invoice.issuedAt,
      })),
      total: INVOICES.length,
    })
  }),

  http.get(`${API_BASE}/billing/invoices/:invoiceId/pdf`, ({ request, params }) => {
    const unauthorized = requireAuth(request)
    if (unauthorized) return unauthorized
    const invoice = INVOICES.find((item) => item.id === String(params.invoiceId))
    if (!invoice) return notFound('Facture introuvable.')
    // Sans générateur de PDF, on rend un fichier texte nommé comme la facture :
    // le téléchargement se déclenche et se vérifie.
    return new HttpResponse(`Facture ${invoice.reference} — ${invoice.period}\nMontant : ${invoice.amountTTC} ${invoice.currency}\n`, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${invoice.reference}.txt"`,
      },
    })
  }),

  http.get(`${API_BASE}/billing/invoices/:invoiceId`, ({ request, params }) => {
    const unauthorized = requireAuth(request)
    if (unauthorized) return unauthorized
    const invoice = INVOICES.find((item) => item.id === String(params.invoiceId))
    return invoice ? HttpResponse.json(invoice) : notFound('Facture introuvable.')
  }),
]
