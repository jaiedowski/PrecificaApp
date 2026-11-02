// Login Google (Google Identity Services, fluxo de token no navegador).
// Escopo: planilhas que a própria pessoa pode abrir (a planilha é compartilhada entre as usuárias).
const ESCOPO = 'https://www.googleapis.com/auth/spreadsheets'
const GSI_URL = 'https://accounts.google.com/gsi/client'

interface RespostaToken {
  access_token?: string
  expires_in?: number
  error?: string
  error_description?: string
}

interface ClienteToken {
  requestAccessToken(opcoes?: { prompt?: string }): void
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string
            scope: string
            callback: (r: RespostaToken) => void
            error_callback?: (e: { type: string; message?: string }) => void
          }): ClienteToken
        }
      }
    }
  }
}

function carregarScript(): Promise<void> {
  if (window.google?.accounts) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = GSI_URL
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Não foi possível carregar o login do Google'))
    document.head.appendChild(s)
  })
}

let token: { valor: string; expiraEm: number } | null = null
let cliente: ClienteToken | null = null
let pendente: { ok: (t: string) => void; erro: (e: Error) => void } | null = null

async function iniciar(): Promise<ClienteToken> {
  if (cliente) return cliente
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
  if (!clientId) throw new Error('Configure VITE_GOOGLE_CLIENT_ID no arquivo .env.local')
  await carregarScript()
  cliente = window.google!.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: ESCOPO,
    callback: (r) => {
      if (r.access_token) {
        token = { valor: r.access_token, expiraEm: Date.now() + (r.expires_in ?? 3600) * 1000 - 60_000 }
        pendente?.ok(r.access_token)
      } else {
        pendente?.erro(new Error(r.error_description ?? r.error ?? 'Login cancelado'))
      }
      pendente = null
    },
    error_callback: (e) => {
      pendente?.erro(new Error(e.message ?? e.type))
      pendente = null
    },
  })
  return cliente
}

/** Devolve um token válido, pedindo login à usuária se necessário. Chamar a partir de um clique. */
export async function obterToken(): Promise<string> {
  if (token && token.expiraEm > Date.now()) return token.valor
  const c = await iniciar()
  return new Promise((ok, erro) => {
    pendente = { ok, erro }
    c.requestAccessToken({ prompt: token ? '' : 'select_account' })
  })
}

export const sair = () => {
  token = null
}
