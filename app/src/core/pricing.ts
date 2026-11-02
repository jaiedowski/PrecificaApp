import type {
  Config,
  ContaFixa,
  Insumo,
  Produto,
  Receita,
} from './types'
import { paraBase, unidadeBase, converter, type Unidade } from './units'

export class DadosInvalidosError extends Error {}

export type MapaInsumos = Record<string, Insumo>

/** Valor da hora = (pró-labore + contas fixas) ÷ horas trabalhadas por mês. */
export function valorHora(config: Config, contas: ContaFixa[]): number {
  if (config.horasMes <= 0) {
    throw new DadosInvalidosError('Informe as horas trabalhadas por mês')
  }
  const fixos = contas.reduce((soma, c) => soma + c.valor, 0)
  return (config.proLabore + fixos) / config.horasMes
}

/** Preço por unidade base do insumo (R$/g, R$/ml, R$/un, R$/cm). */
export function precoUnitarioBase(insumo: Insumo): number {
  const qtd = paraBase(insumo.qtdEmbalagem, insumo.unidadeCompra)
  if (qtd <= 0) throw new DadosInvalidosError(`Quantidade inválida em ${insumo.nome}`)
  return insumo.precoPago / qtd
}

/** Custo de usar `qtd` `unidade` do insumo. */
export function custoInsumo(insumo: Insumo, qtd: number, unidade: Unidade): number {
  // converter() valida a dimensão (lança UnidadeIncompativelError).
  const emBaseDoInsumo = converter(qtd, unidade, unidadeBase(insumo.unidadeCompra))
  return emBaseDoInsumo * precoUnitarioBase(insumo)
}

function buscar(insumos: MapaInsumos, id: string): Insumo {
  const i = insumos[id]
  if (!i) throw new DadosInvalidosError(`Insumo não encontrado: ${id}`)
  return i
}

export interface CustoReceita {
  insumos: number
  maoDeObra: number
  total: number
  /** Custo total ÷ rendimento. */
  porUnidade: number
}

export function custoReceita(
  receita: Receita,
  insumos: MapaInsumos,
  variaveis: Record<string, string>,
  vHora: number,
): CustoReceita {
  if (receita.rendimentoQtd <= 0) {
    throw new DadosInvalidosError(`Rendimento inválido em ${receita.nome}`)
  }
  let somaInsumos = 0
  for (const item of receita.itens) {
    const id = item.tipo === 'fixo' ? item.insumoId : variaveis[item.id]
    if (!id) {
      throw new DadosInvalidosError(
        `Escolha o insumo para "${item.rotulo ?? item.id}" na receita ${receita.nome}`,
      )
    }
    somaInsumos += custoInsumo(buscar(insumos, id), item.quantidade, item.unidade)
  }
  const maoDeObra = (receita.tempoMin / 60) * vHora
  const total = somaInsumos + maoDeObra
  return {
    insumos: somaInsumos,
    maoDeObra,
    total,
    porUnidade: total / receita.rendimentoQtd,
  }
}

export interface CustoProduto {
  insumos: number
  extras: number
  perdas: number
  maoDeObra: number
  total: number
}

export function custoProduto(
  produto: Produto,
  receita: Receita,
  insumos: MapaInsumos,
  config: Config,
  vHora: number,
): CustoProduto {
  const r = custoReceita(receita, insumos, produto.variaveis, vHora)
  const fracao = produto.qtdReceitaUsada / receita.rendimentoQtd
  const insumosReceita = r.insumos * fracao
  const maoReceita = r.maoDeObra * fracao

  const extras = produto.extras.reduce(
    (soma, e) => soma + custoInsumo(buscar(insumos, e.insumoId), e.quantidade, e.unidade),
    0,
  )
  const baseInsumos = insumosReceita + extras
  const perdas = config.perdasAtiva ? config.perdas * baseInsumos : 0
  const maoDeObra = maoReceita + ((produto.minutosExtras ?? 0) / 60) * vHora

  return {
    insumos: insumosReceita,
    extras,
    perdas,
    maoDeObra,
    total: baseInsumos + perdas + maoDeObra,
  }
}

/** Soma dos percentuais que incidem sobre o preço de venda. */
function taxasSobrePreco(config: Config): number {
  return (config.taxaVendaAtiva ? config.taxaVenda : 0) + (config.impostosAtivo ? config.impostos : 0)
}

/** Preço exato (sem arredondar) que gera a margem desejada. Usado também na simulação. */
export function precoParaMargem(custo: number, margem: number, config: Config): number {
  const divisor = 1 - margem - taxasSobrePreco(config)
  if (divisor <= 0) {
    throw new DadosInvalidosError('Margem e taxas somam 100% ou mais')
  }
  return custo / divisor
}

/** Arredonda para cima até o próximo valor terminado em ,90. */
export function arredondarPreco(preco: number): number {
  const centavos = Math.ceil(preco * 100 - 1e-6)
  let alvo = Math.floor(centavos / 100) * 100 + 90
  if (alvo < centavos) alvo += 100
  return alvo / 100
}

export function precoSugerido(custo: number, config: Config): number {
  const exato = precoParaMargem(custo, config.margem, config)
  return config.arredondar ? arredondarPreco(exato) : Math.round(exato * 100) / 100
}

export interface AnalisePreco {
  lucro: number
  /** Fração do preço (0.3 = 30%). */
  margemReal: number
}

export function analisarPreco(custo: number, preco: number, config: Config): AnalisePreco {
  const lucro = preco - custo - taxasSobrePreco(config) * preco
  return { lucro, margemReal: preco > 0 ? lucro / preco : 0 }
}
