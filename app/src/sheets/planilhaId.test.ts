import { describe, expect, it } from 'vitest'
import { extrairPlanilhaId, idDoHash, linkDeAcesso } from './planilhaId'

const ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-aBc'

describe('extrairPlanilhaId', () => {
  it('lê o id de um link completo', () => {
    expect(extrairPlanilhaId(`https://docs.google.com/spreadsheets/d/${ID}/edit?gid=0#gid=0`)).toBe(ID)
  })
  it('aceita o id puro, com espaços', () => {
    expect(extrairPlanilhaId(`  ${ID} `)).toBe(ID)
  })
  it('recusa texto que não é link nem id', () => {
    expect(extrairPlanilhaId('minha planilha')).toBeNull()
    expect(extrairPlanilhaId('')).toBeNull()
  })
})

describe('link de acesso', () => {
  it('gera e lê de volta o mesmo id', () => {
    const link = linkDeAcesso('https://x.github.io/PrecificaApp/', ID)
    expect(link).toBe(`https://x.github.io/PrecificaApp/#s=${ID}`)
    expect(idDoHash(new URL(link).hash)).toBe(ID)
  })
  it('troca um hash anterior em vez de acumular', () => {
    expect(linkDeAcesso('https://x.io/app/#s=outro', ID)).toBe(`https://x.io/app/#s=${ID}`)
  })
  it('ignora hash inválido', () => {
    expect(idDoHash('')).toBeNull()
    expect(idDoHash('#s=curto')).toBeNull()
    expect(idDoHash('#outra=coisa')).toBeNull()
  })
})
