# Sistema de Precificação para Artesãs — Requisitos (v1)

## 1. Visão

App web responsivo (PWA) que ajuda artesãs iniciantes a precificar produtos com clareza. Os dados ficam em uma planilha Google, que só o app acessa. Começa para uso familiar (mãe e irmã: velas, aromatizadores, sabonetes) e deve permitir virar produto no futuro (várias usuárias/negócios, cada um com sua planilha).

**Princípios:** simplicidade acima de tudo; explicar os conceitos (pró-labore, margem, custo fixo) com textos curtos de ajuda; padrões sugeridos que a usuária pode alterar.

## 2. Usuárias e acesso

- Login com conta Google.
- Uma planilha por negócio. Mãe e irmã compartilham a mesma planilha (mesmos insumos, receitas e produtos); a dona a compartilha com a conta Google da outra.
- A planilha é criada automaticamente no primeiro acesso, a partir de um modelo. As usuárias não precisam abri-la.
- Futuro: cada nova usuária/negócio ganha a sua própria planilha.

## 3. Requisitos funcionais

### 3.1 Insumos
- Campos: nome, categoria, unidade de compra, quantidade na embalagem, preço pago, fornecedor, data da compra.
- Só o preço atual (sem histórico). Estoque fica fora da v1.
- O app converte automaticamente a unidade de compra para a unidade de uso (ex.: 1 kg a R$ 40 → R$ 0,04/g).
- Categorias vêm sugeridas (cera, essência, pavio, embalagem, etc.) e a usuária cria as dela.
- Unidades: g, kg, ml, L, unidade, metro, cm.
- Ao alterar o preço de um insumo, receitas e produtos são recalculados automaticamente.

### 3.2 Configurações
- **Pró-labore:** valor mensal único.
- **Horas trabalhadas por mês:** valor único.
- **Contas fixas:** lista livre com exemplo pré-preenchido; cada item tem descrição e valor, e a usuária adiciona, edita e remove. Pode ser um item abrangente ou vários.
- **Valor da hora** (calculado): `(pró-labore + soma das contas fixas) ÷ horas por mês`.
- **Margem de lucro:** única, com valor padrão de mercado (sugerido: 30%, a confirmar) e editável.
- **Outros custos (opcionais, liga/desliga, com explicação e exemplo):**
  - Taxa de venda (maquininha/Pix/plataforma), % sobre o preço. Ligada por padrão com valor sugerido.
  - Perdas e desperdício, % sobre o custo dos insumos. Ligada por padrão com valor sugerido.
  - Impostos, % sobre o preço. Desligado por padrão. Obs.: o MEI costuma ser valor fixo e entra nas contas fixas.
- **Arredondamento do preço final:** sugerir valor "redondo" (ex.: R$ 27,90).
- Fora da v1: frete, atacado.

### 3.3 Receitas
- Uma receita é genérica e serve para velas, sabonetes e aromatizadores.
- Campos: nome, categoria, **rendimento** (quantidade + unidade, ex.: 10 unidades ou 1 L), **tempo total de produção** (minutos, para a receita inteira), anotações (texto livre pessoal).
- Itens da receita: só insumos (sem receita dentro de receita). Cada linha é:
  - **fixa:** insumo + quantidade + unidade; ou
  - **variável:** um espaço com nome e quantidade (ex.: "Essência: 50 ml"), preenchido no produto.
- Custo da receita = insumos + mão de obra (`tempo ÷ 60 × valor da hora`). Custo por unidade de rendimento = custo da receita ÷ rendimento.
- Sem fotos na v1.

### 3.4 Produtos
- O produto é o item vendido (ex.: "Vela Lavanda 200 g"). Composição:
  - uma receita;
  - insumo escolhido para cada espaço variável da receita (ex.: essência de lavanda);
  - quantidade usada da receita (ex.: 1 unidade, ou 250 ml do litro);
  - insumos extras (pote, etiqueta, caixinha, laço).
- Categorias sugeridas (velas, sabonetes, aromatizadores) mais as da usuária.
- Preço único por produto.
- **Tela do produto (simples):** custo total, preço sugerido, preço final editável, lucro por unidade e margem real. O detalhamento do custo fica recolhido.
- O preço final pode ser sobrescrito; a margem real aparece na hora.
- **Simulação "e se":** na tela do produto, a usuária muda o preço (vê lucro e margem) ou informa a margem desejada (vê o preço). Nada é salvo até ela confirmar.

### 3.5 Cálculo do preço
```
Custo = receita usada + extras + perdas% × (insumos da receita + extras)
Preço sugerido = Custo ÷ (1 − margem − taxa de venda − impostos)
Preço final = arredondamento do sugerido (ex.: terminar em ,90)
Margem real = (Preço − Custo − (taxa + impostos) × Preço) ÷ Preço
```

## 4. Requisitos não funcionais
- Português do Brasil, moeda em real.
- Site responsivo (celular e computador), instalável na tela inicial (PWA), com hospedagem gratuita.
- Consulta funciona sem internet (última leitura em cache); edições exigem internet.
- Acesso à planilha somente pelo app, autenticado com Google.

## 5. Modelo da planilha (abas)

| Aba | Colunas |
|---|---|
| Config | chave, valor (pró-labore, horas/mês, margem, taxa venda, perdas, impostos, flags de ativo, arredondamento) |
| ContasFixas | id, descrição, valor |
| Categorias | id, tipo (insumo/receita/produto), nome |
| Insumos | id, nome, categoria, unidade_compra, qtd_embalagem, preço_pago, fornecedor, data_compra, unidade_base, preço_unitário_base (calculado) |
| Receitas | id, nome, categoria, rendimento_qtd, rendimento_unidade, tempo_min, anotações |
| ReceitaItens | id, receita_id, tipo (fixo/variável), insumo_id (se fixo), rótulo (se variável), quantidade, unidade |
| Produtos | id, nome, categoria, receita_id, qtd_receita_usada, preço_final |
| ProdutoVariaveis | produto_id, receita_item_id, insumo_id |
| ProdutoExtras | id, produto_id, insumo_id, quantidade, unidade |

## 6. Fora da v1
Estoque, histórico de preços, fotos, receita dentro de receita, atacado, frete, uso offline com edição.

## 7. Pontos em aberto
1. Confirmar a margem padrão (sugestão: 30%).
2. Conversão entre dimensões (ex.: insumo comprado em g usado em ml) exigiria densidade. Proposta: a v1 só converte dentro da mesma dimensão (massa, volume, comprimento, unidade), e o app avisa quando houver incompatibilidade.
3. Produto pode ter tempo adicional de mão de obra (ex.: embalar)? Proposta: campo opcional "minutos extras" no produto.
4. Valores sugeridos de taxa de venda e perdas (sugestão: 3% e 5%).
5. Escolha da tecnologia e arquitetura (próxima etapa), incluindo como o app grava na planilha (Google Sheets API com login Google).
