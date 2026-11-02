export type Unidade = 'g' | 'kg' | 'ml' | 'L' | 'un' | 'm' | 'cm'
export type Dimensao = 'massa' | 'volume' | 'contagem' | 'comprimento'

export const UNIDADES: Unidade[] = ['g', 'kg', 'ml', 'L', 'un', 'm', 'cm']

const INFO: Record<Unidade, { dimensao: Dimensao; fator: number }> = {
  g: { dimensao: 'massa', fator: 1 },
  kg: { dimensao: 'massa', fator: 1000 },
  ml: { dimensao: 'volume', fator: 1 },
  L: { dimensao: 'volume', fator: 1000 },
  un: { dimensao: 'contagem', fator: 1 },
  cm: { dimensao: 'comprimento', fator: 1 },
  m: { dimensao: 'comprimento', fator: 100 },
}

const BASE: Record<Dimensao, Unidade> = {
  massa: 'g',
  volume: 'ml',
  contagem: 'un',
  comprimento: 'cm',
}

export class UnidadeIncompativelError extends Error {
  de: Unidade
  para: Unidade
  constructor(de: Unidade, para: Unidade) {
    super(`Unidade incompatível: ${de} não pode ser convertida para ${para}`)
    this.de = de
    this.para = para
  }
}

export const dimensao = (u: Unidade): Dimensao => INFO[u].dimensao
export const unidadeBase = (u: Unidade): Unidade => BASE[INFO[u].dimensao]

export function mesmaDimensao(a: Unidade, b: Unidade): boolean {
  return INFO[a].dimensao === INFO[b].dimensao
}

/** Converte uma quantidade para a unidade base da sua dimensão (g, ml, un, cm). */
export function paraBase(qtd: number, u: Unidade): number {
  return qtd * INFO[u].fator
}

/** Converte entre unidades da mesma dimensão. */
export function converter(qtd: number, de: Unidade, para: Unidade): number {
  if (!mesmaDimensao(de, para)) throw new UnidadeIncompativelError(de, para)
  return (qtd * INFO[de].fator) / INFO[para].fator
}
