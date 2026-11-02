import { useState } from 'react'
import { custoReceita, valorHora } from '../core/pricing'
import type { Receita, ReceitaItem } from '../core/types'
import { brl, mensagemDeErro, novoId } from '../lib/format'
import { comCategoria, useDados } from '../store'
import { Campo, LinhaInsumo, Modal, NumInput, SelectUnidade, Vazio } from '../ui'

export default function Receitas() {
  const { dados, mapaInsumos, atualizar } = useDados()
  const [editando, setEditando] = useState<Receita | null>(null)

  const novo = () =>
    setEditando({
      id: novoId('rec'), nome: '', categoria: '', rendimentoQtd: 1, rendimentoUnidade: 'un',
      tempoMin: 0, itens: [],
    })

  function resumo(r: Receita): string {
    if (r.itens.some((i) => i.tipo === 'variavel')) return 'Custo depende do insumo escolhido no produto'
    try {
      const c = custoReceita(r, mapaInsumos, {}, valorHora(dados.config, dados.contas))
      return `${brl(c.porUnidade)} por ${r.rendimentoUnidade} (com mão de obra)`
    } catch (e) {
      return mensagemDeErro(e)
    }
  }

  return (
    <div className="pagina">
      <div className="topo">
        <h1>Receitas</h1>
        <button onClick={novo} disabled={dados.insumos.length === 0}>+ Nova receita</button>
      </div>
      <p className="intro">A receita é a “lista de ingredientes” de uma produção: o que entra, quanto rende e quanto tempo leva.</p>
      {dados.insumos.length === 0 && <Vazio>Cadastre primeiro alguns insumos para poder criar receitas.</Vazio>}
      {dados.insumos.length > 0 && dados.receitas.length === 0 && <Vazio>Nenhuma receita ainda.</Vazio>}
      <ul className="lista">
        {dados.receitas.map((r) => (
          <li key={r.id} className="item" onClick={() => setEditando(r)}>
            <div>
              <strong>{r.nome}</strong>
              <small>{r.categoria} · rende {r.rendimentoQtd.toLocaleString('pt-BR')} {r.rendimentoUnidade} · {r.tempoMin} min</small>
            </div>
            <div className="dir"><small>{resumo(r)}</small></div>
          </li>
        ))}
      </ul>

      {editando && (
        <FormReceita
          inicial={editando}
          existe={dados.receitas.some((r) => r.id === editando.id)}
          onClose={() => setEditando(null)}
          onSalvar={(r) => {
            atualizar((d) => ({
              ...d,
              categorias: comCategoria(d.categorias, 'receita', r.categoria),
              receitas: d.receitas.some((x) => x.id === r.id) ? d.receitas.map((x) => (x.id === r.id ? r : x)) : [...d.receitas, r],
            }))
            setEditando(null)
          }}
          onExcluir={(id) => {
            const p = dados.produtos.find((p) => p.receitaId === id)
            if (p) return window.alert(`Não dá para excluir: a receita é usada no produto "${p.nome}".`)
            if (!window.confirm('Excluir esta receita?')) return
            atualizar((d) => ({ ...d, receitas: d.receitas.filter((x) => x.id !== id) }))
            setEditando(null)
          }}
        />
      )}
    </div>
  )
}

function FormReceita({ inicial, existe, onSalvar, onExcluir, onClose }: {
  inicial: Receita; existe: boolean
  onSalvar: (r: Receita) => void; onExcluir: (id: string) => void; onClose: () => void
}) {
  const { dados } = useDados()
  const [r, setR] = useState(inicial)
  const set = (p: Partial<Receita>) => setR((x) => ({ ...x, ...p }))
  const setItem = (id: string, p: Partial<ReceitaItem>) =>
    set({ itens: r.itens.map((i) => (i.id === id ? { ...i, ...p } : i)) })
  const addItem = (tipo: ReceitaItem['tipo']) =>
    set({
      itens: [...r.itens, {
        id: novoId('it'), tipo, quantidade: 0, unidade: 'g',
        ...(tipo === 'variavel' ? { rotulo: '' } : { insumoId: '' }),
      }],
    })

  const itensOk = r.itens.length > 0 && r.itens.every((i) => i.quantidade > 0 && (i.tipo === 'fixo' ? !!i.insumoId : !!i.rotulo?.trim()))
  const valido = r.nome.trim() !== '' && r.rendimentoQtd > 0 && itensOk

  return (
    <Modal titulo={existe ? 'Editar receita' : 'Nova receita'} onClose={onClose}>
      <Campo label="Nome"><input autoFocus value={r.nome} onChange={(e) => set({ nome: e.target.value })} placeholder="Ex.: Vela de soja 200 g" /></Campo>
      <Campo label="Categoria">
        <input list="cats-receita" value={r.categoria} onChange={(e) => set({ categoria: e.target.value })} />
        <datalist id="cats-receita">{dados.categorias.filter((c) => c.tipo === 'receita').map((c) => <option key={c.id} value={c.nome} />)}</datalist>
      </Campo>

      <div className="duas">
        <Campo label="Quanto esta receita rende" ajuda="Ex.: 10 unidades, ou 1 L de líquido.">
          <NumInput value={r.rendimentoQtd || undefined} onChange={(n) => set({ rendimentoQtd: n ?? 0 })} />
        </Campo>
        <Campo label="Unidade"><SelectUnidade value={r.rendimentoUnidade} onChange={(u) => set({ rendimentoUnidade: u })} /></Campo>
      </div>
      <Campo label="Tempo total de produção" ajuda="Minutos para fazer a receita inteira, do preparo ao acabamento.">
        <NumInput sufixo="min" value={r.tempoMin || undefined} onChange={(n) => set({ tempoMin: n ?? 0 })} />
      </Campo>

      <h3>Ingredientes</h3>
      {r.itens.map((i) =>
        i.tipo === 'fixo' ? (
          <LinhaInsumo
            key={i.id}
            insumos={dados.insumos}
            insumoId={i.insumoId ?? ''}
            quantidade={i.quantidade}
            unidade={i.unidade}
            onChange={(p) => setItem(i.id, p)}
            onRemove={() => set({ itens: r.itens.filter((x) => x.id !== i.id) })}
          />
        ) : (
          <div className="linha-item variavel" key={i.id}>
            <input value={i.rotulo ?? ''} placeholder="Nome do espaço (ex.: Essência)" onChange={(e) => setItem(i.id, { rotulo: e.target.value })} />
            <NumInput value={i.quantidade || undefined} onChange={(n) => setItem(i.id, { quantidade: n ?? 0 })} placeholder="Qtd" />
            <SelectUnidade value={i.unidade} onChange={(u) => setItem(i.id, { unidade: u })} />
            <button className="icone" aria-label="Remover" onClick={() => set({ itens: r.itens.filter((x) => x.id !== i.id) })}>🗑</button>
          </div>
        ),
      )}
      <div className="acoes">
        <button className="sec" onClick={() => addItem('fixo')}>+ Insumo</button>
        <button className="sec" onClick={() => addItem('variavel')}>+ Insumo a escolher no produto</button>
      </div>
      <small>Use “a escolher no produto” quando o insumo muda de um produto para outro, como a essência.</small>

      <Campo label="Anotações (opcional)">
        <textarea rows={3} value={r.anotacoes ?? ''} onChange={(e) => set({ anotacoes: e.target.value || undefined })} placeholder="Modo de preparo, temperaturas, dicas…" />
      </Campo>
      <footer>
        {existe && <button className="perigo" onClick={() => onExcluir(r.id)}>Excluir</button>}
        <button disabled={!valido} onClick={() => onSalvar({ ...r, nome: r.nome.trim(), categoria: r.categoria.trim() })}>Salvar</button>
      </footer>
    </Modal>
  )
}
