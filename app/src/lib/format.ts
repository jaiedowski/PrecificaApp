export const brl = (n: number): string =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const pct = (fracao: number): string =>
  `${(fracao * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`

export const novoId = (prefixo: string): string =>
  `${prefixo}-${crypto.randomUUID().slice(0, 8)}`

export const mensagemDeErro = (e: unknown): string =>
  e instanceof Error ? e.message : String(e)
