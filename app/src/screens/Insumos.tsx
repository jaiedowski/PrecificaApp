import { useState } from 'react'
import { precoUnitarioBase } from '../core/pricing'
import type { Insumo } from '../core/types'
import { unidadeBase } from '../core/units'
import { brl, novoId } from '../lib/format'
import { comCategoria, useDados } from '../store'
import { Campo, Modal, NumInput, SelectCategoria, SelectUnidade, Vazio } from '../ui'

export default function Insumos() {
  const { dados, atualizar } = useDados()
  const [busca, setBusca] = useState('')
  const [editando, setEditando] = useState<Insumo | null>(null)

  const lista = dados.insumos
    .filter((i) => `${i.nome} ${i.categoria} ${i.fornecedor ?? ''}`.toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => a.nome.localeCompare(b.nome))

  const novo = () =>
    setEditando({ id: novoId('ins'), nome: '', categoria: '', unidadeCompra: 'g', qtdEmbalagem: 0, precoPago: 0 })

  return (
    <div className="pagina">
      <div className="topo">
        <h1>Insumos</h1>
        <button onClick={novo}>+ Novo insumo</button>
      </div>
      <p className="intro">Materiais que você compra: cera, essência, pavio, potes… Informe quanto pagou e o app calcula o custo de cada grama ou mililitro.</p>
      {dados.insumos.length > 0 && (
        <input className="busca" placeholder="Buscar insumo…" value={busca} onChange={(e) => setBusca(e.target.value)} />
      )}
      {dados.insumos.length === 0 && <Vazio>Nenhum insumo ainda. Comece cadastrando o primeiro.</Vazio>}
      <ul className="lista">
        {lista.map((i) => (
          <li key={i.id} className="item" onClick={() => setEditando(i)}>
            <div>
              <strong>{i.nome}</strong>
              <small>{i.categoria}{i.fornecedor ? ` · ${i.fornecedor}` : ''}</small>
            </div>
            <div className="dir">
              <span>{brl(i.precoPago)} / {i.qtdEmbalagem.toLocaleString('pt-BR')} {i.unidadeCompra}</span>
              <small>{custoUnitario(i)}</small>
            </div>
          </li>
        ))}
      </ul>

      {editando && (
        <FormInsumo
          inicial={editando}
          existe={dados.insumos.some((i) => i.id === editando.id)}
          categorias={dados.categorias.filter((c) => c.tipo === 'insumo').map((c) => c.nome)}
          onClose={() => setEditando(null)}
          onSalvar={(i) => {
            atualizar((d) => ({
              ...d,
              categorias: comCategoria(d.categorias, 'insumo', i.categoria),
              insumos: d.insumos.some((x) => x.id === i.id) ? d.insumos.map((x) => (x.id === i.id ? i : x)) : [...d.insumos, i],
            }))
            setEditando(null)
          }}
          onExcluir={(id) => {
            const uso = onde(dados, id)
            if (uso) return window.alert(`Não dá para excluir: este insumo é usado em ${uso}. Remova-o de lá primeiro.`)
            if (!window.confirm('Excluir este insumo?')) return
            atualizar((d) => ({ ...d, insumos: d.insumos.filter((x) => x.id !== id) }))
            setEditando(null)
          }}
        />
      )}
    </div>
  )
}

function custoUnitario(i: Insumo): string {
  if (i.qtdEmbalagem <= 0) return ''
  const u = unidadeBase(i.unidadeCompra)
  const p = precoUnitarioBase(i)
  return `${p.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 4 })} por ${u}`
}

function onde(d: ReturnType<typeof useDados>['dados'], id: string): string | null {
  const r = d.receitas.find((r) => r.itens.some((i) => i.insumoId === id))
  if (r) return `a receita "${r.nome}"`
  const p = d.produtos.find((p) => p.extras.some((e) => e.insumoId === id) || Object.values(p.variaveis).includes(id))
  return p ? `o produto "${p.nome}"` : null
}

function FormInsumo({ inicial, existe, categorias, onSalvar, onExcluir, onClose }: {
  inicial: Insumo; existe: boolean; categorias: string[]
  onSalvar: (i: Insumo) => void; onExcluir: (id: string) => void; onClose: () => void
}) {
  const [i, setI] = useState(inicial)
  const set = (p: Partial<Insumo>) => setI((x) => ({ ...x, ...p }))
  const valido = i.nome.trim() !== '' && i.qtdEmbalagem > 0 && i.precoPago >= 0
  return (
    <Modal titulo={existe ? 'Editar insumo' : 'Novo insumo'} onClose={onClose}>
      <Campo label="Nome"><input autoFocus value={i.nome} onChange={(e) => set({ nome: e.target.value })} placeholder="Ex.: Cera de soja" /></Campo>
      <Campo label="Categoria">
        <SelectCategoria value={i.categoria} opcoes={categorias} onChange={(categoria) => set({ categoria })} />
      </Campo>
      <div className="duas">
        <Campo label="Quantidade na embalagem"><NumInput value={i.qtdEmbalagem || undefined} onChange={(n) => set({ qtdEmbalagem: n ?? 0 })} placeholder="Ex.: 1" /></Campo>
        <Campo label="Unidade"><SelectUnidade value={i.unidadeCompra} onChange={(u) => set({ unidadeCompra: u })} /></Campo>
      </div>
      <Campo label="Preço pago pela embalagem"><NumInput sufixo="R$" value={i.precoPago || undefined} onChange={(n) => set({ precoPago: n ?? 0 })} /></Campo>
      {i.qtdEmbalagem > 0 && <p className="dica">Custo: {custoUnitario(i)}</p>}
      <Campo label="Fornecedor (opcional)"><input value={i.fornecedor ?? ''} onChange={(e) => set({ fornecedor: e.target.value || undefined })} /></Campo>
      <Campo label="Data da compra (opcional)"><input type="date" value={i.dataCompra ?? ''} onChange={(e) => set({ dataCompra: e.target.value || undefined })} /></Campo>
      <footer>
        {existe && <button className="perigo" onClick={() => onExcluir(i.id)}>Excluir</button>}
        <button disabled={!valido} onClick={() => onSalvar({ ...i, nome: i.nome.trim(), categoria: i.categoria.trim() })}>Salvar</button>
      </footer>
    </Modal>
  )
}
