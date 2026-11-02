import { valorHora } from '../core/pricing'
import type { Config } from '../core/types'
import { brl, novoId } from '../lib/format'
import { useDados } from '../store'
import { Campo, NumInput, PctInput } from '../ui'

export default function Ajustes() {
  const { dados, atualizar } = useDados()
  const { config, contas } = dados

  const setConfig = (p: Partial<Config>) => atualizar((d) => ({ ...d, config: { ...d.config, ...p } }))

  let hora = 0
  try { hora = valorHora(config, contas) } catch { /* horas = 0: mostra traço abaixo */ }
  const totalFixas = contas.reduce((s, c) => s + c.valor, 0)

  return (
    <div className="pagina">
      <h1>Ajustes</h1>
      <p className="intro">Estes valores valem para todos os produtos. Preencha uma vez e ajuste quando precisar.</p>

      <section className="cartao">
        <h2>Seu trabalho</h2>
        <Campo label="Pró-labore (quanto você quer ganhar por mês)" ajuda="É o seu salário. Ele entra no preço para você ser paga pelo seu trabalho, não só pelo material.">
          <NumInput sufixo="R$" value={config.proLabore} onChange={(n) => setConfig({ proLabore: n ?? 0 })} />
        </Campo>
        <Campo label="Horas trabalhadas por mês" ajuda="Quantas horas por mês você dedica a produzir (não precisa ser exato).">
          <NumInput sufixo="h" value={config.horasMes} onChange={(n) => setConfig({ horasMes: n ?? 0 })} />
        </Campo>
      </section>

      <section className="cartao">
        <h2>Contas fixas do mês</h2>
        <p className="intro">Gastos que existem mesmo sem vender, como luz, internet ou aluguel. Pode colocar um valor só ou separar cada conta.</p>
        {contas.map((c) => (
          <div className="linha-conta" key={c.id}>
            <input
              value={c.descricao}
              placeholder="Descrição"
              onChange={(e) => atualizar((d) => ({ ...d, contas: d.contas.map((x) => x.id === c.id ? { ...x, descricao: e.target.value } : x) }))}
            />
            <NumInput sufixo="R$" value={c.valor} onChange={(n) => atualizar((d) => ({ ...d, contas: d.contas.map((x) => x.id === c.id ? { ...x, valor: n ?? 0 } : x) }))} />
            <button className="icone" aria-label="Remover conta" onClick={() => atualizar((d) => ({ ...d, contas: d.contas.filter((x) => x.id !== c.id) }))}>🗑</button>
          </div>
        ))}
        <button className="sec" onClick={() => atualizar((d) => ({ ...d, contas: [...d.contas, { id: novoId('cf'), descricao: '', valor: 0 }] }))}>
          + Adicionar conta
        </button>
        <p className="total">Total de contas fixas: <strong>{brl(totalFixas)}</strong></p>
      </section>

      <section className="cartao destaque">
        <h2>Valor da sua hora</h2>
        <p className="grande">{config.horasMes > 0 ? brl(hora) : '—'}</p>
        <small>(pró-labore + contas fixas) ÷ horas por mês. É por este valor que o tempo de produção entra no preço.</small>
      </section>

      <section className="cartao">
        <h2>Lucro</h2>
        <Campo label="Margem de lucro" ajuda="Quanto do preço de venda deve sobrar como lucro depois de pagar tudo. Uma margem de 30% significa que, de cada R$ 100 vendidos, R$ 30 são lucro.">
          <PctInput value={config.margem} onChange={(f) => setConfig({ margem: f ?? 0 })} />
        </Campo>
        <label className="check">
          <input type="checkbox" checked={config.arredondar} onChange={(e) => setConfig({ arredondar: e.target.checked })} />
          Arredondar o preço sugerido (ex.: R$ 27,90)
        </label>
      </section>

      <section className="cartao">
        <h2>Outros custos</h2>
        <p className="intro">Ligue só o que se aplica ao seu caso.</p>
        <Opcao
          titulo="Taxa de venda"
          ajuda="Maquininha, Pix ou plataforma de vendas. É descontada do preço que o cliente paga."
          ativo={config.taxaVendaAtiva} valor={config.taxaVenda}
          onAtivo={(a) => setConfig({ taxaVendaAtiva: a })} onValor={(v) => setConfig({ taxaVenda: v })}
        />
        <Opcao
          titulo="Perdas e desperdício"
          ajuda="Cera que sobra, vela que sai com defeito. É um percentual sobre o custo dos insumos."
          ativo={config.perdasAtiva} valor={config.perdas}
          onAtivo={(a) => setConfig({ perdasAtiva: a })} onValor={(v) => setConfig({ perdas: v })}
        />
        <Opcao
          titulo="Impostos"
          ajuda="Só se você paga imposto sobre as vendas. O MEI paga um valor fixo por mês: nesse caso, coloque nas contas fixas."
          ativo={config.impostosAtivo} valor={config.impostos}
          onAtivo={(a) => setConfig({ impostosAtivo: a })} onValor={(v) => setConfig({ impostos: v })}
        />
      </section>
    </div>
  )
}

function Opcao({ titulo, ajuda, ativo, valor, onAtivo, onValor }: {
  titulo: string; ajuda: string; ativo: boolean; valor: number
  onAtivo: (a: boolean) => void; onValor: (v: number) => void
}) {
  return (
    <div className="opcao">
      <label className="check">
        <input type="checkbox" checked={ativo} onChange={(e) => onAtivo(e.target.checked)} />
        <strong>{titulo}</strong>
      </label>
      <small>{ajuda}</small>
      {ativo && <PctInput value={valor} onChange={(f) => onValor(f ?? 0)} />}
    </div>
  )
}
