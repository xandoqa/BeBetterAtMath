# Regras do jogo

Versão 2.1.0

As regras vivem em dois lugares que precisam concordar entre si:
`src/engine.ts` (web) e `tools/bbam.py` (terminal). Ao mudar uma regra, mude
nos dois e atualize este documento.

## A rodada

Toda rodada tem **dez contas**, definidas pela constante `ROUND_LENGTH`. Não há
limite de tempo: o cronômetro só mede quanto durou, para aparecer no resultado.

A rodada termina quando a décima conta é respondida. Não existe mais o avanço
infinito da versão 1.0.0.

## Níveis

O nível define a faixa de números sorteados.

| Nível | Faixa |
| --- | --- |
| Fácil | 1 a 10 |
| Médio | 10 a 50 |
| Difícil | 50 a 100 |

A faixa vale para o **primeiro operando**. O segundo segue regras próprias por
operação, explicadas abaixo, para que a conta continue possível de resolver de
cabeça — multiplicar 87 por 94 não é cálculo mental, é papel.

## Como cada conta é montada

Dado um nível com mínimo `min` e máximo `max`:

| Modo / operação | Primeiro operando | Segundo operando | Resultado |
| --- | --- | --- | --- |
| Tabuada | `min…max` | `1…10` | `a × b` |
| Soma | `min…max` | `min…max` | `a + b` |
| Subtração | `a` em `min…max` | `min…a` | `a − b` |
| Multiplicação | `min…max` | `2…12` | `a × b` |
| Divisão | `b × quociente` | `2…12` | `quociente` |
| Misto | sorteia uma das quatro acima | | |

Duas decisões merecem destaque:

**A divisão é construída ao contrário.** Em vez de sortear `a` e `b` e torcer
para que a divisão feche, o gerador sorteia o divisor e o quociente, e só então
calcula o dividendo. Assim o resultado é sempre inteiro, sem resto e sem
arredondamento.

**A subtração sorteia o segundo operando dentro do primeiro.** Como `b` nunca
passa de `a`, o resultado nunca é negativo.

A mesma conta não aparece duas vezes seguidas: o gerador tenta de novo até seis
vezes antes de aceitar uma repetição.

## Pontuação

Cada acerto vale **dez pontos**, mais **dois pontos por acerto seguido**, com
teto de vinte:

```
pontos = 10 + min(max(sequência − 1, 0), 5) × 2
```

| Sequência | Pontos |
| --- | --- |
| 1 | 10 |
| 2 | 12 |
| 3 | 14 |
| 4 | 16 |
| 5 | 18 |
| 6 ou mais | 20 |

O teto existe para que uma rodada longa de sorte não torne o recorde
inalcançável depois.

Um erro **zera a sequência**, mas não tira pontos. A maior sequência da rodada
é guardada à parte e aparece no resultado.

A pontuação máxima de uma rodada perfeita é **176 pontos**
(10 + 12 + 14 + 16 + 18 + 20 × 5).

## O que acontece a cada resposta

| Situação | O que o jogo faz |
| --- | --- |
| Campo vazio ou sem número | Pede um número e não consome a conta |
| Acerto | Soma os pontos, aumenta a sequência, avança em 0,62 s |
| Erro | Mostra o resultado certo, zera a sequência, guarda a conta para revisão e avança em 1,7 s |

A espera maior no erro é proposital: é o tempo de ler a resposta certa antes de
a próxima conta entrar.

## Recordes

O recorde é guardado por combinação de **modo + operação + nível**. Um recorde
na soma no nível fácil não interfere no recorde da divisão no difícil.

Só a maior pontuação é guardada. Uma rodada de zero ponto nunca vira recorde,
nem quando é a primeira daquela combinação.

No navegador os recordes ficam no `localStorage`; no terminal, em
`~/.bebetteratmath.json`. Em ambos os casos são locais ao aparelho — não há
servidor nem placar compartilhado.
