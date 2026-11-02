# Versão de terminal

Versão 2.1.0 · Python 3.10 ou mais novo

O mesmo treino, sem navegador. Nenhuma dependência além do Python: só
biblioteca padrão.

```bash
python3 tools/bbam.py
```

## Opções

```bash
python3 tools/bbam.py --modo tabuada --nivel facil
python3 tools/bbam.py --modo aleatorio --operacao div --nivel medio
python3 tools/bbam.py --sem-cor
python3 tools/bbam.py --version
```

| Opção | Valores |
| --- | --- |
| `--modo` | `tabuada`, `aleatorio` |
| `--nivel` | `facil`, `medio`, `dificil` |
| `--operacao` | `soma`, `sub`, `mul`, `div`, `misto` |
| `--sem-cor` | Desliga as cores ANSI |
| `--version` | Mostra a versão e sai |

Sem opções, ele pergunta no terminal. Com todas, começa direto.

## Como é jogar

```
  be better at math
  Alexandre e Felipe · v2.1.0

Tabuada · Fácil
10 contas. Enter vazio pula a conta.

 1/10  7 × 8 = 56
       certo  +10 pontos
 2/10  3 × 9 = 27
       certo  +12 pontos
 3/10  6 × 7 = 43
       era 42
```

No fim: pontos, acertos, maior sequência, tempo, recorde e a lista de contas
para revisar.

`Ctrl-C` encerra a rodada e mostra o resultado parcial.

## Regras

São as mesmas da versão web, descritas em
[regras-do-jogo.md](regras-do-jogo.md). Os nomes dos modos e níveis mudam
porque aqui estão em português (`facil` em vez de `easy`, `soma` em vez de
`sum`), mas o comportamento é idêntico — e os testes existem justamente para
garantir que continue assim.

## Recordes

Ficam em `~/.bebetteratmath.json`, em JSON simples:

```json
{
  "tabuada:mul:facil": 176,
  "aleatorio:div:medio": 142
}
```

São separados dos recordes do navegador: cada versão guarda os seus. Para
zerar, apague o arquivo.

Se o arquivo não existir, estiver corrompido ou não puder ser escrito, o jogo
continua normalmente — só não guarda nada.

## Testes

```bash
python3 -m unittest discover -s tools -v
```

13 testes sobre as regras: faixas dos níveis, divisão exata, subtração não
negativa, sorteio do modo misto, pontuação, teto da sequência e recordes.

Os testes usam uma semente fixa (`random.Random(20261102)`), então uma falha é
sempre reproduzível, e um diretório temporário para os recordes, sem tocar no
arquivo real de quem roda.

## Cores

Saem automaticamente quando a saída não é um terminal — num `|`, num `>` ou na
integração contínua —, para que o texto não venha cheio de códigos de escape.
`--sem-cor` força o desligamento.

## Servidor local

O mesmo diretório tem o `serve.py`, que serve o site para desenvolvimento:

```bash
python3 tools/serve.py --porta 3000 --abrir
```

Ele desliga o cache e corrige os tipos MIME dos módulos ES. Detalhes em
[desenvolvimento.md](desenvolvimento.md).
