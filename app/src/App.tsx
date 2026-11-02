import { useMemo, useState } from 'react'
import { obterToken } from './sheets/auth'
import { googleSheetsClient } from './sheets/client'
import { repositorioLocal } from './sheets/localRepo'
import { extrairPlanilhaId, urlPlanilha } from './sheets/planilhaId'
import { criarPlanilha, repositorio } from './sheets/repository'
import Ajustes from './screens/Ajustes'
import Insumos from './screens/Insumos'
import Produtos from './screens/Produtos'
import Receitas from './screens/Receitas'
import { DadosProvider, useDados } from './store'
import { mensagemDeErro } from './lib/format'

const TELAS = [
  { id: 'produtos', nome: 'Produtos', icone: '🏷️', tela: Produtos },
  { id: 'receitas', nome: 'Receitas', icone: '📖', tela: Receitas },
  { id: 'insumos', nome: 'Insumos', icone: '🧵', tela: Insumos },
  { id: 'ajustes', nome: 'Ajustes', icone: '⚙️', tela: Ajustes },
] as const

type TelaId = (typeof TELAS)[number]['id']
const CHAVE_PLANILHA = 'precifica:planilhaId'

function Shell({ planilhaId, onTrocar }: { planilhaId?: string; onTrocar?: () => void }) {
  const { erroSalvar } = useDados()
  const [aba, setAba] = useState<TelaId>('produtos')
  const Tela = TELAS.find((t) => t.id === aba)!.tela
  return (
    <div className="app">
      <nav>
        <span className="marca">Precifica</span>
        {TELAS.map((t) => (
          <button key={t.id} className={t.id === aba ? 'ativa' : ''} onClick={() => setAba(t.id)}>
            <span aria-hidden>{t.icone}</span> {t.nome}
          </button>
        ))}
      </nav>
      <main>
        {!planilhaId && <p className="aviso">Modo demonstração: os dados ficam salvos só neste navegador.</p>}
        {erroSalvar && <p className="aviso erro">Não foi possível salvar: {erroSalvar}</p>}
        <Tela />
        {planilhaId && (
          <p className="rodape">
            <a href={urlPlanilha(planilhaId)} target="_blank" rel="noreferrer">Abrir a planilha no Google</a>
            {' · '}
            <button className="link" onClick={onTrocar}>Trocar de planilha</button>
          </p>
        )}
      </main>
    </div>
  )
}

/** Entrada com Google: entra, cria ou abre a planilha e entrega o repositório. */
function PortaGoogle() {
  const client = useMemo(() => googleSheetsClient(obterToken), [])
  const [logado, setLogado] = useState(false)
  const [planilhaId, setPlanilhaId] = useState<string | null>(() => localStorage.getItem(CHAVE_PLANILHA))
  const [link, setLink] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function executar(acao: () => Promise<void>) {
    setOcupado(true)
    setErro(null)
    try { await acao() } catch (e) { setErro(mensagemDeErro(e)) } finally { setOcupado(false) }
  }

  const escolher = (id: string) => {
    localStorage.setItem(CHAVE_PLANILHA, id)
    setPlanilhaId(id)
  }

  const entrar = () => executar(async () => { await obterToken(); setLogado(true) })

  const criar = () => executar(async () => escolher(await criarPlanilha(client)))

  const usarLink = () => executar(async () => {
    const id = extrairPlanilhaId(link)
    if (!id) throw new Error('Cole o link completo da planilha que você recebeu.')
    // Confere se a pessoa tem acesso e se é uma planilha do Precifica antes de seguir.
    await repositorio(client, id).carregar()
    escolher(id)
  })

  if (logado && planilhaId) {
    const trocar = () => { localStorage.removeItem(CHAVE_PLANILHA); setPlanilhaId(null) }
    return (
      <DadosProvider key={planilhaId} repo={repositorio(client, planilhaId)}>
        <Shell planilhaId={planilhaId} onTrocar={trocar} />
      </DadosProvider>
    )
  }

  return (
    <div className="porta">
      <h1>Precifica</h1>
      <p>Calcule o preço certo dos seus produtos artesanais.</p>
      {!logado ? (
        <button disabled={ocupado} onClick={entrar}>{ocupado ? 'Entrando…' : 'Entrar com Google'}</button>
      ) : (
        <>
          <button disabled={ocupado} onClick={criar}>{ocupado ? 'Aguarde…' : 'Criar minha planilha'}</button>
          <p className="ou">ou, se alguém já compartilhou uma planilha com você:</p>
          <input placeholder="Cole aqui o link da planilha" value={link} onChange={(e) => setLink(e.target.value)} />
          <button className="sec" disabled={ocupado || !link.trim()} onClick={usarLink}>Usar esta planilha</button>
        </>
      )}
      {erro && <p className="erro">{erro}</p>}
    </div>
  )
}

export default function App() {
  const comGoogle = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID)
  const demo = useMemo(() => repositorioLocal, [])
  if (comGoogle) return <PortaGoogle />
  return <DadosProvider repo={demo}><Shell /></DadosProvider>
}
