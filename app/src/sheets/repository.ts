import type { SheetsClient } from './client'
import { DADOS_INICIAIS } from './defaults'
import { ABAS, dadosParaTabelas, tabelasParaDados, type Dados, type Tabelas } from './schema'

const TITULO_PLANILHA = 'Precificação — Meus Produtos'

export interface Repositorio {
  carregar(): Promise<Dados>
  salvar(dados: Dados): Promise<void>
}

/** Cria a planilha com as abas e os dados padrão (exemplos, categorias e configurações). */
export async function criarPlanilha(client: SheetsClient): Promise<string> {
  return client.criar(TITULO_PLANILHA, dadosParaTabelas(DADOS_INICIAIS))
}

export function repositorio(client: SheetsClient, planilhaId: string): Repositorio {
  return {
    async carregar() {
      const lidas = await client.ler(planilhaId, ABAS)
      return tabelasParaDados(lidas as Partial<Tabelas>)
    },
    async salvar(dados) {
      await client.gravar(planilhaId, dadosParaTabelas(dados))
    },
  }
}
