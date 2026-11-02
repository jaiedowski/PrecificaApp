import type { Celula, Tabela } from './schema'

/** Acesso de baixo nível à planilha. Separado para poder ser trocado por um fake nos testes. */
export interface SheetsClient {
  /** Cria a planilha já com as abas e dados informados. Devolve o id. */
  criar(titulo: string, tabelas: Record<string, Tabela>): Promise<string>
  /** Lê as abas; aba inexistente ou vazia vem como tabela vazia. */
  ler(id: string, abas: string[]): Promise<Record<string, Tabela>>
  /** Substitui o conteúdo das abas informadas. */
  gravar(id: string, tabelas: Record<string, Tabela>): Promise<void>
}

const BASE = 'https://sheets.googleapis.com/v4/spreadsheets'

export class SheetsApiError extends Error {
  status: number
  constructor(status: number, mensagem: string) {
    super(mensagem)
    this.status = status
  }
}

export function googleSheetsClient(obterToken: () => Promise<string>): SheetsClient {
  async function chamar<T>(url: string, init: RequestInit = {}): Promise<T> {
    const token = await obterToken()
    const resp = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...init.headers,
      },
    })
    if (!resp.ok) {
      throw new SheetsApiError(resp.status, `Google Sheets (${resp.status}): ${await resp.text()}`)
    }
    return (await resp.json()) as T
  }

  const gravarValores = (id: string, tabelas: Record<string, Tabela>) =>
    chamar(`${BASE}/${id}/values:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        valueInputOption: 'RAW',
        data: Object.entries(tabelas).map(([aba, values]) => ({ range: `${aba}!A1`, values })),
      }),
    })

  return {
    async criar(titulo, tabelas) {
      const criada = await chamar<{ spreadsheetId: string }>(BASE, {
        method: 'POST',
        body: JSON.stringify({
          properties: { title: titulo, locale: 'pt_BR' },
          sheets: Object.keys(tabelas).map((title) => ({
            properties: { title, gridProperties: { frozenRowCount: 1 } },
          })),
        }),
      })
      await gravarValores(criada.spreadsheetId, tabelas)
      return criada.spreadsheetId
    },

    async ler(id, abas) {
      const params = abas.map((a) => `ranges=${encodeURIComponent(a)}`).join('&')
      const r = await chamar<{ valueRanges?: { range: string; values?: Celula[][] }[] }>(
        `${BASE}/${id}/values:batchGet?${params}&valueRenderOption=UNFORMATTED_VALUE`,
      )
      // A API devolve na mesma ordem pedida.
      return Object.fromEntries(abas.map((a, i) => [a, r.valueRanges?.[i]?.values ?? []]))
    },

    async gravar(id, tabelas) {
      await chamar(`${BASE}/${id}/values:batchClear`, {
        method: 'POST',
        body: JSON.stringify({ ranges: Object.keys(tabelas) }),
      })
      await gravarValores(id, tabelas)
    },
  }
}
