const PADRAO_ID = /^[a-zA-Z0-9_-]{20,}$/

/** Extrai o id da planilha de um link do Google Planilhas (ou aceita o próprio id). */
export function extrairPlanilhaId(entrada: string): string | null {
  const t = entrada.trim()
  const link = t.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/)
  if (link) return link[1]
  return PADRAO_ID.test(t) ? t : null
}

export const urlPlanilha = (id: string): string => `https://docs.google.com/spreadsheets/d/${id}/edit`

/** Link do app que já leva a planilha embutida: https://site/caminho/#s=<id>. */
export const linkDeAcesso = (urlDoApp: string, id: string): string =>
  `${urlDoApp.split('#')[0]}#s=${id}`

/** Lê o id da planilha de um hash de URL como "#s=<id>". */
export function idDoHash(hash: string): string | null {
  const m = hash.match(/^#s=([a-zA-Z0-9_-]+)$/)
  return m && PADRAO_ID.test(m[1]) ? m[1] : null
}
