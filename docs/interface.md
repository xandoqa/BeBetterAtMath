# Interface

Versão 2.1.0

## O conceito

**Caderno quadriculado.** O fundo é a malha do caderno escolar, e ela não é
enfeite: o quadriculado de 24 px é o módulo ao qual todo o espaçamento do
layout se alinha. O que está na tela encosta na grade porque a grade é a régua.

Daí decorre o elemento central: **o campo de resposta não é uma caixa, é a
lacuna de uma folha de exercício** — uma linha para preencher, com a resposta
escrita grande em cima dela. É a única peça visualmente ousada da tela; todo o
resto fica quieto para que ela funcione.

## Cor

As cores são declaradas como variáveis em `:root` e redefinidas para o tema
escuro. Nenhum valor fixo aparece fora da lista de tokens.

| Token | Claro | Escuro | Papel |
| --- | --- | --- | --- |
| `--paper` | `#F7F7F4` | `#0E1726` | Fundo |
| `--paper-raised` | `#FFFFFF` | `#16233A` | Cartões e botões de lista |
| `--grid` | azul a 9% | azul claro a 8% | A malha do caderno |
| `--rule` | azul a 18% | azul claro a 22% | Linhas e bordas |
| `--ink` | `#15233B` | `#E8EDF5` | Texto |
| `--ink-soft` | `#566782` | `#94A5BF` | Texto secundário |
| `--blue` | `#1B3A6B` | `#8FB4EC` | Ação principal |
| `--green` | `#1A6340` | `#63D49C` | Acerto |
| `--red` | `#B02A16` | `#FF8471` | Erro |

**O vermelho só aparece quando há erro.** É a cor da caneta de correção, e usá-la
para qualquer outra coisa gastaria o significado dela. O mesmo vale para o
verde. Nenhum dos dois é usado como decoração.

### Contraste

Na versão 1.0.0, o texto `#2769AC` sobre o fundo `#6F8AFF` dava cerca de
**1,7:1** — longe dos 4,5:1 que a WCAG AA pede para texto normal. Era
literalmente difícil de ler.

A paleta atual mantém texto e fundo acima de **12:1** nos dois temas. Há ainda
um bloco `@media (prefers-contrast: more)` que endurece as linhas e iguala o
texto secundário ao principal.

## Tipografia

Duas famílias, com papéis distintos.

**Atkinson Hyperlegible** carrega os números e toda a interface. Ela foi
desenhada pelo Braille Institute justamente para diferenciar caracteres que se
confundem — 1 e 7, 6 e 8, O e 0. Num app de cálculo, ler 6 onde está escrito 8
transforma um acerto em erro, então a escolha resolve um problema real e não só
uma preferência estética.

**Darker Grotesque** é condensada, alta e um pouco angulosa. Ela aparece no
logotipo, nos títulos e nos números grandes do placar, onde o contraste de
largura com a Atkinson cria hierarquia sem precisar de mais uma cor.

Os números usam `font-variant-numeric: tabular-nums`, para que o placar não
dance quando o valor muda de 98 para 100.

## Movimento

Há um movimento por motivo, nenhum por enfeite:

| Movimento | Quando | Por quê |
| --- | --- | --- |
| Entrada da tela | Troca de tela | Mostra que algo mudou |
| Tremor na conta | Resposta errada | Confirma o erro sem depender só da cor |
| Barra de progresso | A cada resposta | Mostra onde a rodada está |
| Pulsar da abertura | Tela inicial | Indica que dá para tocar |

Tudo isso é anulado por `@media (prefers-reduced-motion: reduce)`.

## Acessibilidade

- Link para pular ao conteúdo, visível ao receber foco.
- `:focus-visible` com contorno de 3 px em todos os controles.
- A conta e o retorno de cada resposta são regiões `aria-live`, anunciadas por
  leitor de tela sem roubar o foco do campo.
- Acerto e erro nunca dependem só da cor: há texto, posição e movimento junto.
- Botões indisponíveis usam `disabled` e `aria-disabled`, em vez do `alert()`
  da versão anterior.
- `inputmode="numeric"` abre o teclado numérico no celular, e
  `enterkeyhint="done"` rotula a tecla de envio.
- O campo de resposta é `type="text"` com validação própria, e não
  `type="number"`: o campo numérico descarta silenciosamente o que digitou
  quando o conteúdo é inválido, o que esconderia do jogador o que ele escreveu.

## Layout

Uma coluna, no máximo 432 px, centralizada — o app é pensado para o celular em
pé e apenas não se quebra no computador. A altura usa `100svh` para não pular
quando a barra do navegador móvel aparece e some, e o preenchimento inferior
respeita `env(safe-area-inset-bottom)` nos aparelhos com faixa inferior.
