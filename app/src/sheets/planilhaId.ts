/** Extrai o id da planilha de um link do Google Planilhas (ou aceita o próprio id). */
export function extrairPlanilhaId(entrada: string): string | null {
  const t = entrada.trim()
  const link = t.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/)
  if (link) return link[1]
  return /^[a-zA-Z0-9_-]{20,}$/.test(t) ? t : null
}

export const urlPlanilha = (id: string): string => `https://docs.google.com/spreadsheets/d/${id}/edit`
