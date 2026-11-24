# Progressão

Versão 3.0.0

Como o app mede e recompensa o que você faz. Tudo aqui mora em
`src/progress.ts`, em funções puras — nada de DOM, nada de armazenamento —,
o que permite testar a progressão inteira fora do navegador.

> **Princípio:** nenhum número na tela é decorativo. Toda medalha sai de um
> contador que foi de fato incrementado por uma rodada jogada. Não existe
> progresso simulado.

---

## Duas moedas, dois trabalhos

Elas parecem redundantes e não são:

| | Mede | Serve para |
| --- | --- | --- |
| **Pontos** | O desempenho em **uma** rodada | O placar competitivo, comparando rodada com rodada |
| **XP** | O esforço **acumulado** | A progressão de nível, que só cresce |

Pontos zeram a cada rodada e dependem de sequência; XP nunca diminui. Uma
rodada ruim derruba seus pontos, mas o XP que você ganhou continua seu.

---

## XP

```
XP da rodada = acertos × 2
             + 5 se terminou a rodada (não perdeu todas as vidas)
             + 5 se não errou nenhuma
```

O máximo de uma rodada de 10 contas é **30 XP**.

Mesmo perdendo todas as vidas você leva 2 XP por acerto — errar custa a
rodada, não o progresso.

## Níveis

Cada nível custa 50 XP a mais que o anterior:

| Nível | XP para chegar | Custo do nível |
| --- | --- | --- |
| 1 | 0 | 100 |
| 2 | 100 | 150 |
| 3 | 250 | 200 |
| 4 | 450 | 250 |
| 5 | 700 | 300 |
| 10 | 2.925 | 550 |

A fórmula fechada é `XP(n) = (n − 1) × (25n + 50)`, e os testes conferem ela
contra a soma termo a termo. O teto é o nível 99.

---

## Ofensiva

Dias **seguidos** com pelo menos uma rodada. Não exige bater a meta: jogar
já conta.

- Jogou hoje e tinha jogado ontem → a ofensiva aumenta
- Jogou hoje e o último dia foi anterior a ontem → recomeça em 1
- Já jogou hoje → não muda nada

A virada usa a **data local**, não UTC. Usar `toISOString()` daria a
meia-noite de Londres e quebraria a contagem para quem está no Brasil — às
21h de um dia aqui já seria o dia seguinte lá, e a ofensiva pularia um dia
sozinha.

Ao abrir o app, se o último dia jogado não foi hoje nem ontem, a ofensiva
aparece zerada: mostrar uma sequência que o jogador já perdeu seria mentira.

---

## Vidas

Cinco por rodada. Cada erro tira uma; sem vidas, a rodada termina antes das
dez contas.

As vidas **não regeneram com o tempo** e não há como comprá-las. A rodada
seguinte começa com as cinco de novo. É de propósito: um contador que obriga
a esperar transforma treino em espera, e o objetivo aqui é que você jogue de
novo agora.

---

## Estrelas

Só valem para lições da trilha:

| Estrelas | Quando |
| --- | --- |
| ★★★ | Terminou sem errar nenhuma |
| ★★ | Terminou com até um erro |
| ★ | Terminou |
| — | Perdeu todas as vidas |

O registro da lição guarda **o melhor** desempenho: refazer uma lição e ir
pior não rebaixa as estrelas que você já tinha.

---

## A trilha

24 lições em 6 unidades, em `src/curriculum.ts`. Uma lição destrava quando a
anterior é concluída — é sequencial, não depende de XP nem de nível.

| Unidade | Tema |
| --- | --- |
| 1 · Primeiros passos | Tabuada do 1 ao 10 e soma fácil |
| 2 · Tirando e pondo | Subtração |
| 3 · Tabuada firme | Multiplicação com números maiores |
| 4 · Dividindo | Divisão |
| 5 · Tudo junto | As quatro misturadas |
| 6 · Nível capivara | O desafio final |

> **Ao mexer no currículo:** nunca mude o `id` de uma lição já publicada. O
> progresso é guardado por id, então renomear apaga o que a pessoa já fez.
> Para acrescentar, inclua no fim de uma unidade — inserir no meio muda o
> caminho de quem está na metade.

---

## Meta diária

20, 50 ou 100 XP por dia, escolhida no perfil. O padrão é 50 — cerca de duas
rodadas.

O contador zera na virada do dia, pela mesma data local da ofensiva.

---

## Conquistas

19 medalhas, cada uma com um teste sobre o estado:

| Medalha | Condição |
| --- | --- |
| Primeira rodada | 1 rodada |
| Pegando o jeito | 10 rodadas |
| Veterano | 100 rodadas |
| Sem errar uma | 1 rodada perfeita |
| Impecável | 10 rodadas perfeitas |
| Dez na agulha | 10 acertos seguidos |
| Três dias / Uma semana / Um mês inteiro | ofensiva de 3, 7 e 30 dias |
| 500 de XP / 2.000 de XP | XP acumulado |
| Mil contas | 1.000 contas respondidas |
| Nível 5 / Nível 10 | nível alcançado |
| Tabuada na ponta da língua | 200 multiplicações certas |
| Dividindo bem | 100 divisões certas |
| Unidade fechada | todas as lições de uma unidade |
| Unidade dourada | 3 estrelas em todas as lições de uma unidade |
| Trilha inteira | as 24 lições |

As que contam até um número mostram o progresso parcial ("7 de 10") na tela
de medalhas, enquanto não forem conquistadas.

Os acertos por operação são contados **conta a conta**, pelo símbolo de cada
uma. Contar pela operação da rodada seria impreciso: no modo misto, uma
rodada sorteia as quatro.

---

## Onde isso fica guardado

No `localStorage`, na chave `bbam:progress:v3`, como um JSON só.

Ao ler, o estado salvo é mesclado com um estado vazio: uma versão anterior do
app pode ter salvo sem alguma chave de hoje, e um `undefined` solto no meio
de uma conta de XP apareceria como `NaN` na tela.

Os recordes da v2 (`bbam:best:*`) continuam sendo lidos e escritos — quem já
tinha recorde não perde nada ao atualizar.

Em janela anônima, o `localStorage` **lança exceção** em vez de devolver
vazio. Todo acesso é protegido, e o app avisa no perfil que o progresso vale
só para a sessão.
