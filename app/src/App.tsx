import { useMemo, useState } from 'react'
import { obterToken } from './sheets/auth'
import { googleSheetsClient, SheetsApiError, type SheetsClient } from './sheets/client'
import { repositorioLocal } from './sheets/localRepo'
import { extrairPlanilhaId, idDoHash, linkDeAcesso, urlPlanilha } from './sheets/planilhaId'
import { criarPlanilha, repositorio } from './sheets/repository'
import Ajustes from './screens/Ajustes'
import Insumos from './screens/Insumos'
import Produtos from './screens/Produtos'
import Receitas from './screens/Receitas'
import { DadosProvider, useDados } from './store'
import { mensagemDeErro } from './lib/format'
import { Modal } from './ui'

const TELAS = [
  { id: 'produtos', nome: 'Produtos', icone: '🏷️', tela: Produtos },
  { id: 'receitas', nome: 'Receitas', icone: '📖', tela: Receitas },
  { id: 'insumos', nome: 'Insumos', icone: '🧵', tela: Insumos },
  { id: 'ajustes', nome: 'Ajustes', icone: '⚙️', tela: Ajustes },
] as const

type TelaId = (typeof TELAS)[number]['id']
const CHAVE_PLANILHA = 'precifica:planilhaId'

const urlDoApp = () => location.origin + location.pathname

/** Planilha vinda do link (#s=...) tem prioridade sobre a lembrada no navegador. */
function planilhaInicial(): string | null {
  const doLink = idDoHash(location.hash)
  if (doLink) {
    localStorage.setItem(CHAVE_PLANILHA, doLink)
    history.replaceState(null, '', location.pathname + location.search)
    return doLink
  }
  return localStorage.getItem(CHAVE_PLANILHA)
}

function Shell({ planilhaId, client, onTrocar }: { planilhaId?: string; client?: SheetsClient; onTrocar?: () => void }) {
  const { erroSalvar } = useDados()
  const [aba, setAba] = useState<TelaId>('produtos')
  const [preparando, setPreparando] = useState(false)
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
        {planilhaId && client && (
          <p className="rodape">
            <a href={urlPlanilha(planilhaId)} target="_blank" rel="noreferrer">Abrir a planilha no Google</a>
            {' · '}
            <button className="link" onClick={() => setPreparando(true)}>Preparar planilha para outra pessoa</button>
            {' · '}
            <button className="link" onClick={onTrocar}>Trocar de planilha</button>
          </p>
        )}
      </main>
      {preparando && client && <PrepararPlanilha client={client} onClose={() => setPreparando(false)} />}
    </div>
  )
}

/** Cria uma planilha nova (sem trocar a atual) e gera o link para enviar à cliente. */
function PrepararPlanilha({ client, onClose }: { client: SheetsClient; onClose: () => void }) {
  const [id, setId] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [copiado, setCopiado] = useState(false)

  async function criar() {
    setOcupado(true)
    setErro(null)
    try { setId(await criarPlanilha(client)) } catch (e) { setErro(mensagemDeErro(e)) } finally { setOcupado(false) }
  }

  const link = id ? linkDeAcesso(urlDoApp(), id) : ''
  return (
    <Modal titulo="Preparar planilha para outra pessoa" onClose={onClose}>
      {!id ? (
        <>
          <p>Cria uma planilha nova, já com as configurações e categorias padrão, e gera o link que você envia à cliente.</p>
          <button disabled={ocupado} onClick={criar}>{ocupado ? 'Criando…' : 'Criar planilha'}</button>
        </>
      ) : (
        <ol className="passos">
          <li>
            <a href={urlPlanilha(id)} target="_blank" rel="noreferrer">Abra a planilha</a> e use <strong>Compartilhar</strong> para
            dar acesso de <strong>Editora</strong> ao e-mail Google dela. Se quiser, já deixe insumos e receitas cadastrados.
          </li>
          <li>Enquanto o app está em teste, adicione o e-mail dela em <em>Google Cloud → Público-alvo → Usuários de teste</em>.</li>
          <li>
            Envie este link. Ela só precisa abrir e entrar com o Google:
            <input readOnly value={link} onFocus={(e) => e.target.select()} />
            <button className="sec" onClick={() => navigator.clipboard.writeText(link).then(() => setCopiado(true))}>
              {copiado ? 'Copiado!' : 'Copiar link'}
            </button>
          </li>
        </ol>
      )}
      {erro && <p className="erro">{erro}</p>}
    </Modal>
  )
}

/** Entrada com Google: entra, abre a planilha do link (ou cria uma) e entrega o repositório. */
function PortaGoogle() {
  const client = useMemo(() => googleSheetsClient(obterToken), [])
  const [logado, setLogado] = useState(false)
  const [planilhaId, setPlanilhaId] = useState<string | null>(planilhaInicial)
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

  /** Confere o acesso com mensagem clara, antes de abrir o app. */
  async function conferirAcesso(id: string) {
    try {
      await client.ler(id, ['Config'])
    } catch (e) {
      if (e instanceof SheetsApiError && [403, 404].includes(e.status)) {
        throw new Error('Esta conta Google ainda não tem acesso à planilha. Peça a quem te enviou o link para liberar o seu e-mail, e entre com esse mesmo e-mail.')
      }
      throw e
    }
  }

  const entrar = () => executar(async () => {
    await obterToken()
    if (planilhaId) await conferirAcesso(planilhaId)
    setLogado(true)
  })

  const criar = () => executar(async () => escolher(await criarPlanilha(client)))

  const usarLink = () => executar(async () => {
    const id = extrairPlanilhaId(link)
    if (!id) throw new Error('Cole o link completo da planilha que você recebeu.')
    await conferirAcesso(id)
    escolher(id)
  })

  if (logado && planilhaId) {
    const trocar = () => { localStorage.removeItem(CHAVE_PLANILHA); setPlanilhaId(null) }
    return (
      <DadosProvider key={planilhaId} repo={repositorio(client, planilhaId)}>
        <Shell planilhaId={planilhaId} client={client} onTrocar={trocar} />
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
