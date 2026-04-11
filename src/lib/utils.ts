import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatInTimeZone } from 'date-fns-tz'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return formatInTimeZone(
    new Date(date),
    'Europe/Berlin',
    'dd.MM.yyyy'
  )
}

export function formatDateTime(date: string | Date): string {
  return formatInTimeZone(
    new Date(date),
    'Europe/Berlin',
    'dd.MM.yyyy HH:mm:ss'
  )
}

export function formatTime(date: string | Date): string {
  return formatInTimeZone(new Date(date), 'Europe/Berlin', 'HH:mm:ss')
}

export function calculateVat(grossAmount: number, vatRate: number): {
  net: number
  vat: number
  gross: number
} {
  const net = grossAmount / (1 + vatRate / 100)
  const vat = grossAmount - net
  return {
    net: Math.round(net * 100) / 100,
    vat: Math.round(vat * 100) / 100,
    gross: grossAmount,
  }
}

export function validateSteuernummer(value: string): boolean {
  // Format: XX/XXX/XXXXX (13 digits with slashes)
  return /^\d{2}\/\d{3}\/\d{5}$/.test(value)
}

export function validateUstIdNr(value: string): boolean {
  // DE + 9 digits
  return /^DE\d{9}$/.test(value)
}

export function generateTransactionNumber(lastNumber: number): number {
  return lastNumber + 1
}

export function truncateSignature(signature: string, chars = 8): string {
  if (!signature || signature.length <= chars) return signature
  return `...${signature.slice(-chars)}`
}

export function formatVatRate(rate: number): string {
  return `${rate}%`
}
