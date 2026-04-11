/**
 * fiskaly Cloud TSE API v2 client
 * Docs: https://docs.fiskaly.com/kassensichv/v2
 */

const FISKALY_BASE_URL = process.env.FISKALY_BASE_URL || 'https://kassensichv-middleware.fiskaly.com/api/v2'

let cachedToken: { token: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token
  }

  const response = await fetch(`${FISKALY_BASE_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: process.env.FISKALY_API_KEY,
      api_secret: process.env.FISKALY_API_SECRET,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new FiskalyError(`Authentication failed: ${response.status} ${body}`)
  }

  const data = await response.json()
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }
  return cachedToken.token
}

async function fiskalyRequest<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const token = await getAccessToken()
  const response = await fetch(`${FISKALY_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new FiskalyError(
      `fiskaly API error ${response.status}: ${errorBody}`,
      response.status
    )
  }

  return response.json()
}

export class FiskalyError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message)
    this.name = 'FiskalyError'
  }
}

// ─── TSS (Technical Security System) ──────────────────────────────────────────

export interface FiskalyTss {
  _id: string
  state: 'INITIALIZED' | 'UNINITIALIZED' | 'DISABLED'
  description: string
  serial_number: string
  certificate_expiration_date: number
  signature_algorithm: string
  time_format: string
  created_at: number
  admin_puk: string
}

export async function createTss(merchantId: string): Promise<FiskalyTss> {
  const tssId = crypto.randomUUID()
  return fiskalyRequest<FiskalyTss>('PUT', `/tss/${tssId}`, {
    description: `RapiQ TSS for merchant ${merchantId}`,
    state: 'INITIALIZED',
  })
}

export async function getTss(tssId: string): Promise<FiskalyTss> {
  return fiskalyRequest<FiskalyTss>('GET', `/tss/${tssId}`)
}

// ─── Client (Cash Register) ────────────────────────────────────────────────────

export interface FiskalyClient {
  _id: string
  tss_id: string
  state: 'REGISTERED' | 'DEREGISTERED'
  serial_number: string
  metadata: Record<string, string>
  created_at: number
}

export async function createClient(
  tssId: string,
  merchantId: string
): Promise<FiskalyClient> {
  const clientId = crypto.randomUUID()
  return fiskalyRequest<FiskalyClient>('PUT', `/tss/${tssId}/client/${clientId}`, {
    serial_number: `RAPIQ-${merchantId.substring(0, 8).toUpperCase()}`,
    metadata: { merchant_id: merchantId, software: 'RapiQ', version: '1.0.0' },
  })
}

export async function getClientInfo(
  tssId: string,
  clientId: string
): Promise<FiskalyClient> {
  return fiskalyRequest<FiskalyClient>('GET', `/tss/${tssId}/client/${clientId}`)
}

// ─── Transactions ──────────────────────────────────────────────────────────────

export interface FiskalyTransactionPayload {
  state: 'ACTIVE' | 'FINISHED' | 'CANCELLED'
  client_id: string
  schema: {
    standard_v1: {
      receipt: {
        receipt_type: 'RECEIPT' | 'INFO'
        amounts_per_vat_rate: Array<{
          vat_rate: string
          amount: string
        }>
        amounts_per_payment_type?: Array<{
          payment_type: 'CASH' | 'NON_CASH'
          amount: string
          currency_code?: string
        }>
      }
    }
  }
}

export interface FiskalyTransaction {
  _id: string
  state: string
  client_id: string
  tss_id: string
  number: number
  signature: {
    value: string
    counter: number
    algorithm: string
    public_key: string
  }
  time_start: number
  time_end: number | null
  process_type: string
  process_data: string
  qr_code_data: string
  metadata: Record<string, unknown>
}

export async function startTransaction(
  tssId: string,
  clientId: string
): Promise<FiskalyTransaction> {
  const txId = crypto.randomUUID()
  return fiskalyRequest<FiskalyTransaction>(
    'PUT',
    `/tss/${tssId}/tx/${txId}`,
    {
      state: 'ACTIVE',
      client_id: clientId,
      schema: {
        standard_v1: {
          receipt: {
            receipt_type: 'RECEIPT',
            amounts_per_vat_rate: [],
          },
        },
      },
    }
  )
}

export interface FinishTransactionParams {
  tssId: string
  txId: string
  clientId: string
  vat7Net: number
  vat19Net: number
  paymentMethod: 'cash' | 'card'
  total: number
  processType?: string
}

export async function finishTransaction(
  params: FinishTransactionParams
): Promise<FiskalyTransaction> {
  const {
    tssId,
    txId,
    clientId,
    vat7Net,
    vat19Net,
    paymentMethod,
    total,
    processType = 'RECEIPT',
  } = params

  const amountsPerVatRate = []
  if (vat7Net > 0) {
    amountsPerVatRate.push({ vat_rate: '7.00', amount: vat7Net.toFixed(2) })
  }
  if (vat19Net > 0) {
    amountsPerVatRate.push({ vat_rate: '19.00', amount: vat19Net.toFixed(2) })
  }
  if (amountsPerVatRate.length === 0) {
    amountsPerVatRate.push({ vat_rate: '19.00', amount: total.toFixed(2) })
  }

  return fiskalyRequest<FiskalyTransaction>(
    'PUT',
    `/tss/${tssId}/tx/${txId}`,
    {
      state: 'FINISHED',
      client_id: clientId,
      schema: {
        standard_v1: {
          receipt: {
            receipt_type: processType === 'RECEIPT' ? 'RECEIPT' : 'INFO',
            amounts_per_vat_rate: amountsPerVatRate,
            amounts_per_payment_type: [
              {
                payment_type: paymentMethod === 'cash' ? 'CASH' : 'NON_CASH',
                amount: total.toFixed(2),
                currency_code: 'EUR',
              },
            ],
          },
        },
      },
    }
  )
}

export async function cancelTransaction(
  tssId: string,
  txId: string,
  clientId: string
): Promise<FiskalyTransaction> {
  return fiskalyRequest<FiskalyTransaction>(
    'PUT',
    `/tss/${tssId}/tx/${txId}`,
    {
      state: 'CANCELLED',
      client_id: clientId,
      schema: {
        standard_v1: {
          receipt: {
            receipt_type: 'INFO',
            amounts_per_vat_rate: [],
          },
        },
      },
    }
  )
}

export async function getTssStatus(tssId: string) {
  const tss = await getTss(tssId)
  return {
    state: tss.state,
    serialNumber: tss.serial_number,
    certificateExpirationDate: tss.certificate_expiration_date,
  }
}
