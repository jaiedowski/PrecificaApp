import { precoUnitarioBase } from '../core/pricing'
import type {
  Categoria,
  Config,
  ContaFixa,
  Insumo,
  Produto,
  Receita,
  ReceitaItem,
} from '../core/types'
import { unidadeBase, UNIDADES, type Unidade } from '../core/units'
import { CONFIG_PADRAO } from './defaults'

export type Celula = string | number | boolean
export type Tabela = Celula[][] // primeira linha = cabeçalho

export interface Dados {
  config: Config
  contas: ContaFixa[]
  categorias: Categoria[]
  insumos: Insumo[]
  receitas: Receita[]
  produtos: Produto[]
}

export const COLUNAS = {
  Config: ['chave', 'valor'],
  ContasFixas: ['id', 'descricao', 'valor'],
  Categorias: ['id', 'tipo', 'nome'],
  Insumos: [
    'id', 'nome', 'categoria', 'unidade_compra', 'qtd_embalagem', 'preco_pago',
    'fornecedor', 'data_compra', 'unidade_base', 'preco_unitario_base',
  ],
  Receitas: [
    'id', 'nome', 'categoria', 'rendimento_qtd', 'rendimento_unidade', 'tempo_min', 'anotacoes',
  ],
  ReceitaItens: ['id', 'receita_id', 'tipo', 'insumo_id', 'rotulo', 'quantidade', 'unidade'],
  Produtos: [
    'id', 'nome', 'categoria', 'receita_id', 'qtd_receita_usada', 'minutos_extras', 'preco_final',
  ],
  ProdutoVariaveis: ['produto_id', 'receita_item_id', 'insumo_id'],
  ProdutoExtras: ['id', 'produto_id', 'insumo_id', 'quantidade', 'unidade'],
} as const

export type Aba = keyof typeof COLUNAS
export const ABAS = Object.keys(COLUNAS) as Aba[]
export type Tabelas = Record<Aba, Tabela>

// ---------- leitura tolerante (a planilha pode ter células vazias ou texto) ----------

type Linha = Record<string, Celula | undefined>

function linhas(tabela: Tabela | undefined): Linha[] {
  if (!tabela || tabela.length < 2) return []
  const [cab, ...resto] = tabela
  return resto
    .filter((r) => r.some((c) => c !== '' && c !== undefined && c !== null))
    .map((r) => Object.fromEntries(cab.map((nome, i) => [String(nome), r[i]])))
}

const str = (v: Celula | undefined): string => (v === undefined || v === null ? '' : String(v))
const strOpt = (v: Celula | undefined): string | undefined => (str(v) === '' ? undefined : str(v))
const num = (v: Celula | undefined): number => {
  if (typeof v === 'number') return v
  const n = Number(str(v).replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}
const numOpt = (v: Celula | undefined): number | undefined =>
  str(v) === '' ? undefined : num(v)
const bool = (v: Celula | undefined): boolean =>
  v === true || str(v).toUpperCase() === 'TRUE'
const unidade = (v: Celula | undefined): Unidade => {
  const u = str(v) as Unidade
  return UNIDADES.includes(u) ? u : 'un'
}

// ---------- Config (chave/valor) ----------

const CHAVES_CONFIG: (keyof Config)[] = [
  'proLabore', 'horasMes', 'margem', 'taxaVenda', 'taxaVendaAtiva',
  'perdas', 'perdasAtiva', 'impostos', 'impostosAtivo', 'arredondar',
]

function configParaTabela(c: Config): Tabela {
  return [[...COLUNAS.Config], ...CHAVES_CONFIG.map((k): Celula[] => [k, c[k]])]
}

function tabelaParaConfig(t: Tabela | undefined): Config {
  const mapa = Object.fromEntries(linhas(t).map((l) => [str(l.chave), l.valor]))
  const resultado = { ...CONFIG_PADRAO } as Record<keyof Config, number | boolean>
  for (const k of CHAVES_CONFIG) {
    if (mapa[k] === undefined || mapa[k] === '') continue
    resultado[k] = typeof CONFIG_PADRAO[k] === 'boolean' ? bool(mapa[k]) : num(mapa[k])
  }
  return resultado as unknown as Config
}

// ---------- Dados <-> Tabelas ----------

const cab = (aba: Aba): Celula[] => [...COLUNAS[aba]]

export function dadosParaTabelas(d: Dados): Tabelas {
  return {
    Config: configParaTabela(d.config),
    ContasFixas: [cab('ContasFixas'), ...d.contas.map((c) => [c.id, c.descricao, c.valor])],
    Categorias: [cab('Categorias'), ...d.categorias.map((c) => [c.id, c.tipo, c.nome])],
    Insumos: [
      cab('Insumos'),
      ...d.insumos.map((i) => [
        i.id, i.nome, i.categoria, i.unidadeCompra, i.qtdEmbalagem, i.precoPago,
        i.fornecedor ?? '', i.dataCompra ?? '',
        // colunas informativas, recalculadas a cada gravação e ignoradas na leitura
        unidadeBase(i.unidadeCompra), precoUnitarioBase(i),
      ]),
    ],
    Receitas: [
      cab('Receitas'),
      ...d.receitas.map((r) => [
        r.id, r.nome, r.categoria, r.rendimentoQtd, r.rendimentoUnidade, r.tempoMin,
        r.anotacoes ?? '',
      ]),
    ],
    ReceitaItens: [
      cab('ReceitaItens'),
      ...d.receitas.flatMap((r) =>
        r.itens.map((i) => [
          i.id, r.id, i.tipo, i.insumoId ?? '', i.rotulo ?? '', i.quantidade, i.unidade,
        ]),
      ),
    ],
    Produtos: [
      cab('Produtos'),
      ...d.produtos.map((p) => [
        p.id, p.nome, p.categoria, p.receitaId, p.qtdReceitaUsada,
        p.minutosExtras ?? '', p.precoFinal ?? '',
      ]),
    ],
    ProdutoVariaveis: [
      cab('ProdutoVariaveis'),
      ...d.produtos.flatMap((p) =>
        Object.entries(p.variaveis).map(([itemId, insumoId]) => [p.id, itemId, insumoId]),
      ),
    ],
    ProdutoExtras: [
      cab('ProdutoExtras'),
      ...d.produtos.flatMap((p) =>
        p.extras.map((e, n) => [`${p.id}-${n + 1}`, p.id, e.insumoId, e.quantidade, e.unidade]),
      ),
    ],
  }
}

export function tabelasParaDados(t: Partial<Tabelas>): Dados {
  const itensPorReceita = new Map<string, ReceitaItem[]>()
  for (const l of linhas(t.ReceitaItens)) {
    const item: ReceitaItem = {
      id: str(l.id),
      tipo: str(l.tipo) === 'variavel' ? 'variavel' : 'fixo',
      insumoId: strOpt(l.insumo_id),
      rotulo: strOpt(l.rotulo),
      quantidade: num(l.quantidade),
      unidade: unidade(l.unidade),
    }
    const lista = itensPorReceita.get(str(l.receita_id)) ?? []
    lista.push(item)
    itensPorReceita.set(str(l.receita_id), lista)
  }

  const variaveisPorProduto = new Map<string, Record<string, string>>()
  for (const l of linhas(t.ProdutoVariaveis)) {
    const m = variaveisPorProduto.get(str(l.produto_id)) ?? {}
    m[str(l.receita_item_id)] = str(l.insumo_id)
    variaveisPorProduto.set(str(l.produto_id), m)
  }

  const extrasPorProduto = new Map<string, Produto['extras']>()
  for (const l of linhas(t.ProdutoExtras)) {
    const lista = extrasPorProduto.get(str(l.produto_id)) ?? []
    lista.push({ insumoId: str(l.insumo_id), quantidade: num(l.quantidade), unidade: unidade(l.unidade) })
    extrasPorProduto.set(str(l.produto_id), lista)
  }

  return {
    config: tabelaParaConfig(t.Config),
    contas: linhas(t.ContasFixas).map((l) => ({
      id: str(l.id), descricao: str(l.descricao), valor: num(l.valor),
    })),
    categorias: linhas(t.Categorias).map((l) => ({
      id: str(l.id),
      tipo: (['insumo', 'receita', 'produto'].includes(str(l.tipo)) ? str(l.tipo) : 'insumo') as Categoria['tipo'],
      nome: str(l.nome),
    })),
    insumos: linhas(t.Insumos).map((l): Insumo => ({
      id: str(l.id),
      nome: str(l.nome),
      categoria: str(l.categoria),
      unidadeCompra: unidade(l.unidade_compra),
      qtdEmbalagem: num(l.qtd_embalagem),
      precoPago: num(l.preco_pago),
      fornecedor: strOpt(l.fornecedor),
      dataCompra: strOpt(l.data_compra),
    })),
    receitas: linhas(t.Receitas).map((l): Receita => ({
      id: str(l.id),
      nome: str(l.nome),
      categoria: str(l.categoria),
      rendimentoQtd: num(l.rendimento_qtd),
      rendimentoUnidade: unidade(l.rendimento_unidade),
      tempoMin: num(l.tempo_min),
      anotacoes: strOpt(l.anotacoes),
      itens: itensPorReceita.get(str(l.id)) ?? [],
    })),
    produtos: linhas(t.Produtos).map((l): Produto => ({
      id: str(l.id),
      nome: str(l.nome),
      categoria: str(l.categoria),
      receitaId: str(l.receita_id),
      qtdReceitaUsada: num(l.qtd_receita_usada),
      variaveis: variaveisPorProduto.get(str(l.id)) ?? {},
      extras: extrasPorProduto.get(str(l.id)) ?? [],
      minutosExtras: numOpt(l.minutos_extras),
      precoFinal: numOpt(l.preco_final),
    })),
  }
}
