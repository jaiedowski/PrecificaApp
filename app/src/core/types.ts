import type { Unidade } from './units'

export interface Insumo {
  id: string
  nome: string
  categoria: string
  unidadeCompra: Unidade
  qtdEmbalagem: number
  precoPago: number
  fornecedor?: string
  dataCompra?: string
}

export interface Categoria {
  id: string
  tipo: 'insumo' | 'receita' | 'produto'
  nome: string
}

export interface ContaFixa {
  id: string
  descricao: string
  valor: number
}

/** Percentuais são frações (0.3 = 30%). */
export interface Config {
  proLabore: number
  horasMes: number
  margem: number
  taxaVenda: number
  taxaVendaAtiva: boolean
  perdas: number
  perdasAtiva: boolean
  impostos: number
  impostosAtivo: boolean
  arredondar: boolean
}

export interface ReceitaItem {
  id: string
  tipo: 'fixo' | 'variavel'
  /** Só para itens fixos. */
  insumoId?: string
  /** Só para itens variáveis (ex.: "Essência"). */
  rotulo?: string
  quantidade: number
  unidade: Unidade
}

export interface Receita {
  id: string
  nome: string
  categoria: string
  rendimentoQtd: number
  rendimentoUnidade: Unidade
  tempoMin: number
  anotacoes?: string
  itens: ReceitaItem[]
}

export interface ProdutoExtra {
  insumoId: string
  quantidade: number
  unidade: Unidade
}

export interface Produto {
  id: string
  nome: string
  categoria: string
  receitaId: string
  /** Quantidade usada da receita, na unidade de rendimento dela. */
  qtdReceitaUsada: number
  /** receitaItemId -> insumoId escolhido para o item variável. */
  variaveis: Record<string, string>
  extras: ProdutoExtra[]
  minutosExtras?: number
  precoFinal?: number
}
