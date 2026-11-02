import { describe, expect, it } from 'vitest'
import {
  analisarPreco,
  arredondarPreco,
  custoInsumo,
  custoProduto,
  custoReceita,
  precoParaMargem,
  precoSugerido,
  precoUnitarioBase,
  valorHora,
  type MapaInsumos,
} from './pricing'
import type { Config, Insumo, Produto, Receita } from './types'
import { converter, UnidadeIncompativelError } from './units'

const config: Config = {
  proLabore: 2000,
  horasMes: 100,
  margem: 0.3,
  taxaVenda: 0.05,
  taxaVendaAtiva: true,
  perdas: 0.1,
  perdasAtiva: true,
  impostos: 0,
  impostosAtivo: false,
  arredondar: true,
}

const cera: Insumo = {
  id: 'cera', nome: 'Cera de soja', categoria: 'Cera',
  unidadeCompra: 'kg', qtdEmbalagem: 1, precoPago: 40,
}
const essLav: Insumo = {
  id: 'lav', nome: 'Essência lavanda', categoria: 'Essência',
  unidadeCompra: 'ml', qtdEmbalagem: 100, precoPago: 50,
}
const pote: Insumo = {
  id: 'pote', nome: 'Pote', categoria: 'Embalagem',
  unidadeCompra: 'un', qtdEmbalagem: 10, precoPago: 30,
}
const insumos: MapaInsumos = { cera, lav: essLav, pote }

// 1 kg de cera = R$ 0,04/g; essência = R$ 0,50/ml
const receita: Receita = {
  id: 'r1', nome: 'Vela de soja', categoria: 'Velas',
  rendimentoQtd: 10, rendimentoUnidade: 'un', tempoMin: 120,
  itens: [
    { id: 'i1', tipo: 'fixo', insumoId: 'cera', quantidade: 1.8, unidade: 'kg' },
    { id: 'i2', tipo: 'variavel', rotulo: 'Essência', quantidade: 100, unidade: 'ml' },
  ],
}

describe('unidades', () => {
  it('converte dentro da mesma dimensão', () => {
    expect(converter(1.5, 'kg', 'g')).toBe(1500)
    expect(converter(250, 'ml', 'L')).toBe(0.25)
    expect(converter(2, 'm', 'cm')).toBe(200)
  })
  it('recusa dimensões diferentes', () => {
    expect(() => converter(1, 'g', 'ml')).toThrow(UnidadeIncompativelError)
  })
})

describe('insumos', () => {
  it('calcula preço por unidade base', () => {
    expect(precoUnitarioBase(cera)).toBeCloseTo(0.04)
    expect(precoUnitarioBase(pote)).toBeCloseTo(3)
  })
  it('calcula custo convertendo unidades', () => {
    expect(custoInsumo(cera, 80, 'g')).toBeCloseTo(3.2)
    expect(custoInsumo(essLav, 0.05, 'L')).toBeCloseTo(25)
  })
  it('rejeita unidade incompatível', () => {
    expect(() => custoInsumo(cera, 10, 'ml')).toThrow(UnidadeIncompativelError)
  })
})

describe('valor da hora', () => {
  it('soma pró-labore e contas fixas', () => {
    const v = valorHora(config, [{ id: 'a', descricao: 'Luz', valor: 150 }, { id: 'b', descricao: 'Internet', valor: 50 }])
    expect(v).toBe(22)
  })
  it('exige horas > 0', () => {
    expect(() => valorHora({ ...config, horasMes: 0 }, [])).toThrow()
  })
})

describe('receita', () => {
  it('soma insumos, mão de obra e divide pelo rendimento', () => {
    const r = custoReceita(receita, insumos, { i2: 'lav' }, 20)
    // cera 1800g × 0,04 = 72 ; essência 100ml × 0,5 = 50 ; mão de obra 2h × 20 = 40
    expect(r.insumos).toBeCloseTo(122)
    expect(r.maoDeObra).toBeCloseTo(40)
    expect(r.total).toBeCloseTo(162)
    expect(r.porUnidade).toBeCloseTo(16.2)
  })
  it('exige escolher o insumo do item variável', () => {
    expect(() => custoReceita(receita, insumos, {}, 20)).toThrow(/Essência/)
  })
})

describe('produto e preço', () => {
  const produto: Produto = {
    id: 'p1', nome: 'Vela Lavanda', categoria: 'Velas', receitaId: 'r1',
    qtdReceitaUsada: 1, variaveis: { i2: 'lav' },
    extras: [{ insumoId: 'pote', quantidade: 1, unidade: 'un' }],
  }

  it('calcula custo por unidade com extras, perdas e mão de obra', () => {
    const c = custoProduto(produto, receita, insumos, config, 20)
    expect(c.insumos).toBeCloseTo(12.2)
    expect(c.extras).toBeCloseTo(3)
    expect(c.perdas).toBeCloseTo(1.52)
    expect(c.maoDeObra).toBeCloseTo(4)
    expect(c.total).toBeCloseTo(20.72)
  })

  it('inclui minutos extras no produto', () => {
    const c = custoProduto({ ...produto, minutosExtras: 30 }, receita, insumos, config, 20)
    expect(c.maoDeObra).toBeCloseTo(14)
  })

  it('usa fração da receita (ex.: 250 ml de 1 L)', () => {
    const liquido: Receita = {
      id: 'r2', nome: 'Home spray', categoria: 'Aromatizadores',
      rendimentoQtd: 1, rendimentoUnidade: 'L', tempoMin: 0,
      itens: [{ id: 'x', tipo: 'fixo', insumoId: 'lav', quantidade: 100, unidade: 'ml' }],
    }
    const c = custoProduto(
      { ...produto, receitaId: 'r2', qtdReceitaUsada: 0.25, variaveis: {}, extras: [] },
      liquido, insumos, { ...config, perdasAtiva: false }, 20,
    )
    expect(c.total).toBeCloseTo(12.5)
  })

  it('sugere preço = custo ÷ (1 − margem − taxa), arredondado', () => {
    // 20,72 ÷ 0,65 = 31,877 → 31,90
    expect(precoSugerido(20.72, config)).toBe(31.9)
    expect(precoSugerido(20.72, { ...config, arredondar: false })).toBe(31.88)
  })

  it('ignora taxas desligadas', () => {
    expect(precoParaMargem(70, 0.3, { ...config, taxaVendaAtiva: false })).toBeCloseTo(100)
  })

  it('recusa margem + taxas >= 100%', () => {
    expect(() => precoParaMargem(10, 0.96, config)).toThrow()
  })

  it('mostra lucro e margem real do preço editado (simulação)', () => {
    const a = analisarPreco(20.72, 28, config)
    // lucro = 28 − 20,72 − 5% × 28 = 5,88
    expect(a.lucro).toBeCloseTo(5.88)
    expect(a.margemReal).toBeCloseTo(0.21)
    // no preço exato da margem desejada, a margem real bate
    const exato = precoParaMargem(20.72, 0.3, config)
    expect(analisarPreco(20.72, exato, config).margemReal).toBeCloseTo(0.3)
  })
})

describe('arredondamento', () => {
  it.each([
    [27.0, 27.9],
    [27.9, 27.9],
    [27.91, 28.9],
    [31.877, 31.9],
    [0.5, 0.9],
  ])('%d → %d', (entrada, saida) => {
    expect(arredondarPreco(entrada)).toBeCloseTo(saida)
  })
})
