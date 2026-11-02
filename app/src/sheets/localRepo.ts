import { DADOS_INICIAIS } from './defaults'
import type { Repositorio } from './repository'
import type { Dados } from './schema'

const CHAVE = 'precifica:dados'

/** Modo demonstração: guarda tudo no navegador, sem Google. */
export const repositorioLocal: Repositorio = {
  async carregar() {
    try {
      const s = localStorage.getItem(CHAVE)
      if (s) return JSON.parse(s) as Dados
    } catch {
      /* dados corrompidos ou storage bloqueado: começa do zero */
    }
    return structuredClone(DADOS_INICIAIS)
  },
  async salvar(dados) {
    localStorage.setItem(CHAVE, JSON.stringify(dados))
  },
}
