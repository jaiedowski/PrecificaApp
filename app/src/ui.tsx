import { useEffect, useState, type ReactNode } from 'react'
import type { Insumo } from './core/types'
import { mesmaDimensao, UNIDADES, unidadeBase, type Unidade } from './core/units'

export function Modal({ titulo, onClose, children }: { titulo: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-label={titulo}>
        <header>
          <h2>{titulo}</h2>
          <button className="icone" onClick={onClose} aria-label="Fechar">✕</button>
        </header>
        {children}
      </div>
    </div>
  )
}

export function Campo({ label, ajuda, children }: { label: string; ajuda?: string; children: ReactNode }) {
  return (
    <label className="campo">
      <span className="rotulo">{label}</span>
      {children}
      {ajuda && <small>{ajuda}</small>}
    </label>
  )
}

const paraTexto = (v: number | undefined) => (v === undefined ? '' : String(v).replace('.', ','))
const paraNumero = (t: string): number | undefined => {
  if (t.trim() === '') return undefined
  const n = Number(t.replace(',', '.'))
  return Number.isFinite(n) ? n : undefined
}

export function NumInput({ value, onChange, placeholder, sufixo }: {
  value: number | undefined
  onChange: (n: number | undefined) => void
  placeholder?: string
  sufixo?: string
}) {
  const [txt, setTxt] = useState(paraTexto(value))
  useEffect(() => {
    if (paraNumero(txt) !== value) setTxt(paraTexto(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return (
    <span className="num">
      <input
        inputMode="decimal"
        value={txt}
        placeholder={placeholder}
        onChange={(e) => {
          setTxt(e.target.value)
          onChange(paraNumero(e.target.value))
        }}
      />
      {sufixo && <span className="sufixo">{sufixo}</span>}
    </span>
  )
}

/** Percentual: o valor é uma fração (0.3), a pessoa digita 30. */
export function PctInput({ value, onChange }: { value: number | undefined; onChange: (f: number | undefined) => void }) {
  return (
    <NumInput
      sufixo="%"
      value={value === undefined ? undefined : Math.round(value * 10000) / 100}
      onChange={(n) => onChange(n === undefined ? undefined : n / 100)}
    />
  )
}

export function SelectUnidade({ value, onChange, como }: {
  value: Unidade
  onChange: (u: Unidade) => void
  /** Se informado, mostra só unidades da mesma dimensão desta. */
  como?: Unidade
}) {
  const opcoes = como ? UNIDADES.filter((u) => mesmaDimensao(u, como)) : UNIDADES
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as Unidade)}>
      {opcoes.map((u) => <option key={u}>{u}</option>)}
    </select>
  )
}

const NOVA_CATEGORIA = '__nova__'

/** Lista de seleção de categoria (igual às demais); a última opção permite criar uma nova. */
export function SelectCategoria({ value, opcoes, onChange }: {
  value: string
  opcoes: string[]
  onChange: (nome: string) => void
}) {
  const [criando, setCriando] = useState(false)
  const [novo, setNovo] = useState('')
  const lista = value && !opcoes.includes(value) ? [...opcoes, value] : opcoes

  const confirmar = () => {
    if (!novo.trim()) return
    onChange(novo.trim())
    setNovo('')
    setCriando(false)
  }

  if (criando) {
    return (
      <div className="linha-nova">
        <input
          autoFocus
          value={novo}
          placeholder="Nome da nova categoria"
          onChange={(e) => setNovo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); confirmar() }
            if (e.key === 'Escape') setCriando(false)
          }}
        />
        <button type="button" className="sec" disabled={!novo.trim()} onClick={confirmar}>Adicionar</button>
        <button type="button" className="icone" aria-label="Cancelar" onClick={() => setCriando(false)}>✕</button>
      </div>
    )
  }
  return (
    <select value={value} onChange={(e) => (e.target.value === NOVA_CATEGORIA ? setCriando(true) : onChange(e.target.value))}>
      <option value="">Escolha a categoria…</option>
      {lista.map((c) => <option key={c} value={c}>{c}</option>)}
      <option value={NOVA_CATEGORIA}>+ Nova categoria…</option>
    </select>
  )
}

/** Linha "insumo + quantidade + unidade", usada em receitas e em extras de produtos. */
export function LinhaInsumo({ insumos, insumoId, quantidade, unidade, onChange, onRemove }: {
  insumos: Insumo[]
  insumoId: string
  quantidade: number
  unidade: Unidade
  onChange: (p: { insumoId?: string; quantidade?: number; unidade?: Unidade }) => void
  onRemove: () => void
}) {
  const escolhido = insumos.find((i) => i.id === insumoId)
  return (
    <div className="linha-item">
      <select
        value={insumoId}
        onChange={(e) => {
          const novo = insumos.find((i) => i.id === e.target.value)
          const ajusta = novo && !mesmaDimensao(unidade, novo.unidadeCompra)
          onChange({ insumoId: e.target.value, ...(ajusta ? { unidade: unidadeBase(novo.unidadeCompra) } : {}) })
        }}
      >
        <option value="">Escolha o insumo…</option>
        {insumos.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}
      </select>
      <NumInput value={quantidade} onChange={(n) => onChange({ quantidade: n ?? 0 })} placeholder="Qtd" />
      <SelectUnidade value={unidade} como={escolhido?.unidadeCompra} onChange={(u) => onChange({ unidade: u })} />
      <button className="icone" onClick={onRemove} aria-label="Remover">🗑</button>
    </div>
  )
}

export function Vazio({ children }: { children: ReactNode }) {
  return <p className="vazio">{children}</p>
}
