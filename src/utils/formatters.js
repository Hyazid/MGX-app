// ============================================================
// src/utils/formatters.js
// ============================================================
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: fr })
  } catch {
    return dateStr
  }
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  try {
    return format(parseISO(dateStr), 'dd/MM/yyyy HH:mm', { locale: fr })
  } catch {
    return dateStr
  }
}

export function formatMontant(val, currency = 'DZD') {
  if (val == null) return '—'
  return new Intl.NumberFormat('fr-DZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(val) + ' ' + currency
}

export function formatQte(val, unite = '') {
  if (val == null) return '—'
  return `${val} ${unite}`.trim()
}
