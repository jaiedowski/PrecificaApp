import { describe, expect, it } from 'vitest'
import { extrairPlanilhaId } from './planilhaId'

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
