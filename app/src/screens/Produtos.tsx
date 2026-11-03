import { useState } from 'react'
import {
  analisarPreco, custoProduto, precoParaMargem, precoSugerido, valorHora,
  type CustoProduto, type MapaInsumos,
} from '../core/pricing'
import type { Produto } from '../core/types'
import { mesmaDimensao } from '../core/units'
import { brl, mensagemDeErro, novoId, pct } from '../lib/format'
import type { Dados } from '../sheets/schema'
import { comCategoria, useDados } from '../store'
import { Campo, LinhaInsumo, Modal, NumInput, PctInput, SelectCategoria, Vazio } from '../ui'

type Calculo = { ok: true; custo: CustoProduto; sugerido: number } | { ok: false; erro: string }

function calcular(p: Produto, d: Dados, mapa: MapaInsumos): Calculo {
  try {
    const receita = d.receitas.find((r) => r.id === p.receitaId)
    if (!receita) return { ok: false, erro: 'Escolha a receita' }
    const custo = custoProduto(p, receita, mapa, d.config, valorHora(d.config, d.contas))
    return { ok: true, custo, sugerido: precoSugerido(custo.total, d.config) }
  } catch (e) {
    return { ok: false, erro: mensagemDeErro(e) }
  }
}

export default function Produtos() {
  const { dados, mapaInsumos, atualizar } = useDados()
  const [editando, setEditando] = useState<Produto | null>(null)

  const novo = () =>
    setEditando({
      id: novoId('prod'), nome: '', categoria: '', receitaId: '', qtdReceitaUsada: 1,
      variaveis: {}, extras: [],
    })

  return (
    <div className="pagina">
      <div className="topo">
        <h1>Produtos</h1>
        <button onClick={novo} disabled={dados.receitas.length === 0}>+ Novo produto</button>
      </div>
      <p className="intro">O produto é o que o cliente compra. Aqui você vê quanto custa fazer e por quanto vender.</p>
      {dados.receitas.length === 0 && <Vazio>Crie uma receita antes de cadastrar produtos.</Vazio>}
      {dados.receitas.length > 0 && dados.produtos.length === 0 && <Vazio>Nenhum produto ainda.</Vazio>}
      <ul className="lista">
        {dados.produtos.map((p) => {
          const c = calcular(p, dados, mapaInsumos)
          const preco = p.precoFinal ?? (c.ok ? c.sugerido : undefined)
          return (
            <li key={p.id} className="item" onClick={() => setEditando(p)}>
              <div>
                <strong>{p.nome}</strong>
                <small>{p.categoria}{c.ok ? ` · custo ${brl(c.custo.total)}` : ''}</small>
              </div>
              <div className="dir">
                {c.ok && preco !== undefined ? (
                  <>
                    <span className="preco">{brl(preco)}</span>
                    <small>lucro {brl(analisarPreco(c.custo.total, preco, dados.config).lucro)}</small>
                  </>
                ) : <small className="erro">{c.ok ? '' : c.erro}</small>}
              </div>
            </li>
          )
        })}
      </ul>

      {editando && (
        <FormProduto
          inicial={editando}
          existe={dados.produtos.some((p) => p.id === editando.id)}
          onClose={() => setEditando(null)}
          onSalvar={(p) => {
            atualizar((d) => ({
              ...d,
              categorias: comCategoria(d.categorias, 'produto', p.categoria),
              produtos: d.produtos.some((x) => x.id === p.id) ? d.produtos.map((x) => (x.id === p.id ? p : x)) : [...d.produtos, p],
            }))
            setEditando(null)
          }}
          onExcluir={(id) => {
            if (!window.confirm('Excluir este produto?')) return
            atualizar((d) => ({ ...d, produtos: d.produtos.filter((x) => x.id !== id) }))
            setEditando(null)
          }}
        />
      )}
    </div>
  )
}

function FormProduto({ inicial, existe, onSalvar, onExcluir, onClose }: {
  inicial: Produto; existe: boolean
  onSalvar: (p: Produto) => void; onExcluir: (id: string) => void; onClose: () => void
}) {
  const { dados, mapaInsumos } = useDados()
  const [p, setP] = useState(inicial)
  const [margemSim, setMargemSim] = useState<number | undefined>()
  const set = (x: Partial<Produto>) => setP((v) => ({ ...v, ...x }))

  const receita = dados.receitas.find((r) => r.id === p.receitaId)
  const itensVariaveis = receita?.itens.filter((i) => i.tipo === 'variavel') ?? []
  const calc = calcular(p, dados, mapaInsumos)
  const sugerido = calc.ok ? calc.sugerido : undefined
  const preco = p.precoFinal ?? sugerido
  const analise = calc.ok && preco !== undefined ? analisarPreco(calc.custo.total, preco, dados.config) : null

  const valido = p.nome.trim() !== '' && !!receita && p.qtdReceitaUsada > 0 && calc.ok

  function simularMargem(m: number | undefined) {
    setMargemSim(m)
    if (m === undefined || !calc.ok) return
    try {
      set({ precoFinal: Math.round(precoParaMargem(calc.custo.total, m, dados.config) * 100) / 100 })
    } catch { /* margem + taxas >= 100%: ignora */ }
  }

  return (
    <Modal titulo={existe ? 'Editar produto' : 'Novo produto'} onClose={onClose}>
      <Campo label="Nome"><input autoFocus value={p.nome} onChange={(e) => set({ nome: e.target.value })} placeholder="Ex.: Vela Lavanda 200 g" /></Campo>
      <Campo label="Categoria">
        <SelectCategoria
          value={p.categoria}
          opcoes={dados.categorias.filter((c) => c.tipo === 'produto').map((c) => c.nome)}
          onChange={(categoria) => set({ categoria })}
        />
      </Campo>

      <Campo label="Receita">
        <select value={p.receitaId} onChange={(e) => set({ receitaId: e.target.value, variaveis: {} })}>
          <option value="">Escolha a receita…</option>
          {dados.receitas.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
        </select>
      </Campo>

      {receita && (
        <Campo label={`Quanto desta receita vai em 1 produto (${receita.rendimentoUnidade})`} ajuda={`A receita rende ${receita.rendimentoQtd} ${receita.rendimentoUnidade}. Ex.: se rende 1 L e o frasco tem 250 ml, use 0,25.`}>
          <NumInput value={p.qtdReceitaUsada || undefined} onChange={(n) => set({ qtdReceitaUsada: n ?? 0 })} />
        </Campo>
      )}

      {itensVariaveis.map((item) => (
        <Campo key={item.id} label={`${item.rotulo} (${item.quantidade} ${item.unidade})`}>
          <select value={p.variaveis[item.id] ?? ''} onChange={(e) => set({ variaveis: { ...p.variaveis, [item.id]: e.target.value } })}>
            <option value="">Escolha…</option>
            {dados.insumos.filter((i) => mesmaDimensao(i.unidadeCompra, item.unidade)).map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}
          </select>
        </Campo>
      ))}

      <h3>Extras (pote, etiqueta, laço…)</h3>
      {p.extras.map((e, n) => (
        <LinhaInsumo
          key={n}
          insumos={dados.insumos}
          insumoId={e.insumoId}
          quantidade={e.quantidade}
          unidade={e.unidade}
          onChange={(x) => set({ extras: p.extras.map((y, m) => (m === n ? { ...y, ...x } : y)) })}
          onRemove={() => set({ extras: p.extras.filter((_, m) => m !== n) })}
        />
      ))}
      <button className="sec" onClick={() => set({ extras: [...p.extras, { insumoId: '', quantidade: 1, unidade: 'un' }] })}>+ Adicionar extra</button>

      <Campo label="Minutos extras de trabalho (opcional)" ajuda="Tempo só deste produto, como embalar ou etiquetar.">
        <NumInput sufixo="min" value={p.minutosExtras} onChange={(n) => set({ minutosExtras: n })} />
      </Campo>

      <section className="cartao destaque">
        <h3>Preço</h3>
        {!calc.ok ? (
          <p className="erro">{calc.erro}</p>
        ) : (
          <>
            <p className="linha-valor"><span>Custo para fazer 1</span><strong>{brl(calc.custo.total)}</strong></p>
            <p className="linha-valor"><span>Preço sugerido</span><strong>{brl(calc.sugerido)}</strong></p>
            <Campo label="Preço final de venda" ajuda="Pode mudar o valor e ver na hora quanto sobra de lucro.">
              <NumInput sufixo="R$" value={preco} onChange={(n) => { setMargemSim(undefined); set({ precoFinal: n }) }} />
            </Campo>
            {analise && (
              <p className={`resultado ${analise.lucro < 0 ? 'negativo' : ''}`}>
                Lucro por unidade: <strong>{brl(analise.lucro)}</strong> · margem <strong>{pct(analise.margemReal)}</strong>
                {analise.lucro < 0 && ' — você estaria perdendo dinheiro'}
              </p>
            )}
            <Campo label="Simulação: que preço dá a margem que eu quero?">
              <PctInput value={margemSim} onChange={simularMargem} />
            </Campo>
            {p.precoFinal !== undefined && <button className="sec" onClick={() => { setMargemSim(undefined); set({ precoFinal: undefined }) }}>Voltar ao preço sugerido</button>}
            <details>
              <summary>Ver detalhes do custo</summary>
              <p className="linha-valor"><span>Insumos da receita</span><span>{brl(calc.custo.insumos)}</span></p>
              <p className="linha-valor"><span>Extras</span><span>{brl(calc.custo.extras)}</span></p>
              <p className="linha-valor"><span>Perdas</span><span>{brl(calc.custo.perdas)}</span></p>
              <p className="linha-valor"><span>Mão de obra</span><span>{brl(calc.custo.maoDeObra)}</span></p>
            </details>
          </>
        )}
      </section>

      <footer>
        {existe && <button className="perigo" onClick={() => onExcluir(p.id)}>Excluir</button>}
        <button disabled={!valido} onClick={() => onSalvar({ ...p, nome: p.nome.trim(), categoria: p.categoria.trim(), extras: p.extras.filter((e) => e.insumoId) })}>Salvar</button>
      </footer>
    </Modal>
  )
}
