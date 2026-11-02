import type { Categoria, Config, ContaFixa } from '../core/types'
import type { Dados } from './schema'

export const CONFIG_PADRAO: Config = {
  proLabore: 1500,
  horasMes: 80,
  margem: 0.3,
  taxaVenda: 0.03,
  taxaVendaAtiva: true,
  perdas: 0.05,
  perdasAtiva: true,
  impostos: 0,
  impostosAtivo: false,
  arredondar: true,
}

export const CONTAS_PADRAO: ContaFixa[] = [
  { id: 'cf1', descricao: 'Exemplo: Energia elétrica', valor: 100 },
  { id: 'cf2', descricao: 'Exemplo: Internet', valor: 100 },
]

const cat = (tipo: Categoria['tipo'], nomes: string[]): Categoria[] =>
  nomes.map((nome, i) => ({ id: `${tipo}-${i + 1}`, tipo, nome }))

export const CATEGORIAS_PADRAO: Categoria[] = [
  ...cat('insumo', ['Cera', 'Essência', 'Pavio', 'Embalagem', 'Base de sabonete', 'Corante', 'Outros']),
  ...cat('receita', ['Velas', 'Sabonetes', 'Aromatizadores']),
  ...cat('produto', ['Velas', 'Sabonetes', 'Aromatizadores']),
]

export const DADOS_INICIAIS: Dados = {
  config: CONFIG_PADRAO,
  contas: CONTAS_PADRAO,
  categorias: CATEGORIAS_PADRAO,
  insumos: [],
  receitas: [],
  produtos: [],
}
