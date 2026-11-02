import { describe, expect, it } from 'vitest'
import type { SheetsClient } from './client'
import { criarPlanilha, repositorio } from './repository'
import { DADOS_INICIAIS } from './defaults'
import { dadosParaTabelas, tabelasParaDados, type Dados, type Tabela } from './schema'

/** Planilha em memória, imitando a API (valores em células, aba vazia = []). */
function clienteFake(): SheetsClient & { planilhas: Map<string, Record<string, Tabela>> } {
  const planilhas = new Map<string, Record<string, Tabela>>()
  return {
    planilhas,
    async criar(_t, tabelas) {
      planilhas.set('p1', structuredClone(tabelas))
      return 'p1'
    },
    async ler(id, abas) {
      const p = planilhas.get(id)!
      return Object.fromEntries(abas.map((a) => [a, structuredClone(p[a] ?? [])]))
    },
    async gravar(id, tabelas) {
      Object.assign(planilhas.get(id)!, structuredClone(tabelas))
    },
  }
}

const dados: Dados = {
  ...DADOS_INICIAIS,
  config: { ...DADOS_INICIAIS.config, margem: 0.4, impostosAtivo: true, impostos: 0.06 },
  insumos: [
    { id: 'cera', nome: 'Cera de soja', categoria: 'Cera', unidadeCompra: 'kg', qtdEmbalagem: 1, precoPago: 40, fornecedor: 'Loja X', dataCompra: '2026-10-20' },
    { id: 'lav', nome: 'Essência lavanda', categoria: 'Essência', unidadeCompra: 'ml', qtdEmbalagem: 100, precoPago: 50 },
    { id: 'pote', nome: 'Pote', categoria: 'Embalagem', unidadeCompra: 'un', qtdEmbalagem: 10, precoPago: 30 },
  ],
  receitas: [
    {
      id: 'r1', nome: 'Vela de soja', categoria: 'Velas', rendimentoQtd: 10, rendimentoUnidade: 'un',
      tempoMin: 120, anotacoes: 'Derreter a 70°C',
      itens: [
        { id: 'i1', tipo: 'fixo', insumoId: 'cera', rotulo: undefined, quantidade: 1.8, unidade: 'kg' },
        { id: 'i2', tipo: 'variavel', insumoId: undefined, rotulo: 'Essência', quantidade: 100, unidade: 'ml' },
      ],
    },
  ],
  produtos: [
    {
      id: 'p1', nome: 'Vela Lavanda', categoria: 'Velas', receitaId: 'r1', qtdReceitaUsada: 1,
      variaveis: { i2: 'lav' }, extras: [{ insumoId: 'pote', quantidade: 1, unidade: 'un' }],
      minutosExtras: 10, precoFinal: 29.9,
    },
  ],
}

describe('serialização das abas', () => {
  it('ida e volta preserva todos os dados', () => {
    expect(tabelasParaDados(dadosParaTabelas(dados))).toEqual(dados)
  })

  it('grava colunas informativas do insumo (unidade base e preço unitário)', () => {
    const linha = dadosParaTabelas(dados).Insumos[1]
    expect(linha.slice(-2)).toEqual(['g', 0.04])
  })

  it('tolera planilha vazia e valores digitados como texto', () => {
    const d = tabelasParaDados({})
    expect(d.insumos).toEqual([])
    expect(d.config.margem).toBe(0.3)

    const t = dadosParaTabelas(dados)
    t.Insumos[1][5] = '40,50' // preço digitado à mão com vírgula
    expect(tabelasParaDados(t).insumos[0].precoPago).toBe(40.5)
  })
})

describe('repositório', () => {
  it('cria a planilha com os dados padrão e carrega de volta', async () => {
    const client = clienteFake()
    const id = await criarPlanilha(client)
    const carregado = await repositorio(client, id).carregar()
    expect(carregado).toEqual(DADOS_INICIAIS)
  })

  it('salva e recarrega', async () => {
    const client = clienteFake()
    const id = await criarPlanilha(client)
    const repo = repositorio(client, id)
    await repo.salvar(dados)
    expect(await repo.carregar()).toEqual(dados)
  })
})
