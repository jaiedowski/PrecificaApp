import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react'
import type { MapaInsumos } from './core/pricing'
import type { Categoria } from './core/types'
import { mensagemDeErro, novoId } from './lib/format'
import type { Repositorio } from './sheets/repository'
import type { Dados } from './sheets/schema'

interface Contexto {
  dados: Dados
  mapaInsumos: MapaInsumos
  atualizar: (fn: (d: Dados) => Dados) => void
  erroSalvar: string | null
}

const Ctx = createContext<Contexto | null>(null)

export function useDados(): Contexto {
  const c = useContext(Ctx)
  if (!c) throw new Error('useDados fora do provedor')
  return c
}

/** Devolve as categorias com `nome` garantido para o tipo (cria se for nova). */
export function comCategoria(cats: Categoria[], tipo: Categoria['tipo'], nome: string): Categoria[] {
  const n = nome.trim()
  if (!n || cats.some((c) => c.tipo === tipo && c.nome.toLowerCase() === n.toLowerCase())) return cats
  return [...cats, { id: novoId('cat'), tipo, nome: n }]
}

export function DadosProvider({ repo, children }: { repo: Repositorio; children: ReactNode }) {
  const [dados, setDados] = useState<Dados | null>(null)
  const [erroCarregar, setErroCarregar] = useState<string | null>(null)
  const [erroSalvar, setErroSalvar] = useState<string | null>(null)
  const atual = useRef<Dados | null>(null)
  const fila = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    repo.carregar().then(
      (d) => { atual.current = d; setDados(d) },
      (e) => setErroCarregar(mensagemDeErro(e)),
    )
  }, [repo])

  const atualizar = useCallback((fn: (d: Dados) => Dados) => {
    if (!atual.current) return
    const novo = fn(atual.current)
    atual.current = novo
    setDados(novo)
    // Gravações em sequência, para nunca chegarem fora de ordem.
    fila.current = fila.current
      .then(() => repo.salvar(novo))
      .then(() => setErroSalvar(null))
      .catch((e) => setErroSalvar(mensagemDeErro(e)))
  }, [repo])

  const mapaInsumos = useMemo<MapaInsumos>(
    () => Object.fromEntries((dados?.insumos ?? []).map((i) => [i.id, i])),
    [dados],
  )

  if (erroCarregar) return <p className="erro centro">Não foi possível carregar: {erroCarregar}</p>
  if (!dados) return <p className="centro">Carregando…</p>
  return <Ctx.Provider value={{ dados, mapaInsumos, atualizar, erroSalvar }}>{children}</Ctx.Provider>
}
