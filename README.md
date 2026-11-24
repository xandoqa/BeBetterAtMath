<div align="center">

<img src="assets/img/icone.svg" width="104" alt="Capi, a capivara mascote" />

# Be Better at Math

**Treino diário de cálculo mental — tabuada e as quatro operações.**

Dez contas por rodada, cinco vidas, uma trilha para seguir.
Funciona no navegador, instala no celular e abre sem internet.

[![CI](https://github.com/xandoqa/BeBetterAtMath/actions/workflows/ci.yml/badge.svg)](https://github.com/xandoqa/BeBetterAtMath/actions/workflows/ci.yml)
![Versão](https://img.shields.io/badge/vers%C3%A3o-3.0.0-6b3df5)
![Licença](https://img.shields.io/badge/licen%C3%A7a-MIT-00a894)

Desenvolvido por **[Alexandre](https://github.com/xandoqa)** ([@xandoqa](https://github.com/xandoqa)) e **Felipe**

</div>

---

## O intuito

Cálculo mental não melhora lendo sobre cálculo mental: melhora fazendo conta,
um pouco todo dia. O problema é que "um pouco todo dia" é exatamente o que
ninguém sustenta sem um motivo para voltar.

Este app existe para resolver esse pedaço. A rodada é curta de propósito — dez
contas, menos de um minuto — para caber em qualquer intervalo. E o progresso
fica visível: você destrava lições, acumula XP, mantém uma ofensiva de dias e
coleciona medalhas. A ideia é que abrir o app amanhã seja mais fácil do que
não abrir.

A referência de experiência é o Duolingo, mas a identidade é própria: paleta
violeta e turquesa, botões de plástico com aresta que afunda, e uma capivara
chamada **Capi** no lugar de qualquer coruja.

> **Nada aqui é enfeite.** Toda medalha sai de um contador que foi de fato
> incrementado por uma rodada jogada, e todo número na tela veio de algo que
> você fez. Não há progresso falso.

---

## O que dá para fazer

| | |
| --- | --- |
| 🗺️ **Trilha** | 24 lições em 6 unidades, destravando uma a uma. Cada lição rende até 3 estrelas. |
| 🎲 **Treino livre** | Escolha operação e nível e treine o que quiser, sem travas. |
| ⚡ **XP e níveis** | 2 XP por acerto, mais bônus por terminar e por não errar nenhuma. |
| 🔥 **Ofensiva** | Dias seguidos jogando. Vira à meia-noite do seu fuso, não de Londres. |
| ❤️ **Vidas** | Cinco por rodada. Acabou, a rodada acaba — dá para refazer na hora. |
| 🏅 **Medalhas** | 19 conquistas, de "primeira rodada" a "trilha inteira". |
| 🎯 **Meta diária** | 20, 50 ou 100 XP por dia, como você preferir. |
| 📱 **Instalável** | É um PWA: instala no celular e funciona offline. |
| 🏆 **Placar** | Opcional, com Docker. Compara sua pontuação com a de outras pessoas. |

### As operações

| Modo | O que faz | Níveis |
| --- | --- | --- |
| Tabuada | Multiplicação com o primeiro fator na faixa do nível | Fácil 1–10 · Médio 10–50 · Difícil 50–100 |
| Soma, subtração, multiplicação, divisão | Uma operação por vez | as mesmas três faixas |
| Misto | As quatro sorteadas na mesma rodada | as mesmas três faixas |

A divisão sempre fecha em número inteiro e a subtração nunca dá negativo: as
contas são montadas de trás para frente para garantir isso.

---

## Como rodar

### A forma rápida — só o jogo

Precisa de **Python 3.10+** (já vem no Linux e no macOS).

```bash
git clone https://github.com/xandoqa/BeBetterAtMath.git
cd BeBetterAtMath
python3 tools/serve.py --abrir
```

Pronto: <http://localhost:8000>.

> **Por que não dá para abrir o `index.html` com dois cliques?**
> O app usa módulos ES, e o navegador recusa módulos carregados por `file://`.
> O erro que aparece fala de CORS e não deixa isso óbvio — mas é sempre o
> servidor que falta. Use o comando acima.

### A forma completa — com placar compartilhado

Precisa de **Docker**. Sobe banco, API e site de uma vez.

```bash
./iniciar.sh          # Linux e macOS
iniciar.bat           # Windows
```

| | |
| --- | --- |
| site | <http://localhost:8080> |
| API | <http://localhost:8000/api/saude> |
| documentação da API | <http://localhost:8000/docs> |

Para desligar:

```bash
./parar.sh                   # mantém os dados
./parar.sh --apagar-dados    # apaga o banco também
```

Os `.bat` aceitam as mesmas opções. Detalhes e solução de problemas em
**[docs/docker.md](docs/docker.md)**.

### Rodando pelo VS Code

Passo a passo completo, do clone ao depurador, em
**[docs/vscode.md](docs/vscode.md)**.

### No terminal, sem navegador

```bash
python3 tools/bbam.py
python3 tools/bbam.py --modo aleatorio --operacao div --nivel medio
```

---

## Mexendo no código

A lógica é escrita em **TypeScript**, em `src/`, e compilada para `assets/js/`.

```bash
npm install        # instala só o compilador TypeScript
npm run build      # compila src/ → assets/js/
npm run watch      # recompila a cada alteração
npm run check      # só checa os tipos
npm test           # testes das regras (Python)
```

> **Mexeu em `src/`? Rode `npm run build` e commite `assets/js/` junto.**
> O build fica versionado para o GitHub Pages servir o site sem etapa de
> compilação, e a CI recusa o push se os dois estiverem fora de sincronia.

---

## Estrutura

```
.
├── index.html              Todas as telas
├── manifest.webmanifest    Configuração do PWA
├── service-worker.js       Cache e funcionamento offline
├── iniciar.sh / .bat       Sobe o ambiente completo
├── parar.sh / .bat         Desliga
├── docker-compose.yml      Banco, API e site
│
├── src/                    TypeScript — a fonte
│   ├── engine.ts           Regras de uma rodada (sem DOM)
│   ├── curriculum.ts       Unidades e lições da trilha (só dado)
│   ├── progress.ts         XP, níveis, ofensiva, conquistas (funções puras)
│   ├── storage.ts          Persistência local
│   ├── router.ts           Navegação por hash
│   ├── sfx.ts              Sons gerados por WebAudio
│   ├── api.ts              Cliente do placar (tolerante a falha)
│   └── app.ts              Orquestração
│
├── assets/
│   ├── css/style.css       Tokens, componentes e temas
│   ├── js/                 Build gerado (versionado de propósito)
│   └── img/                Ícones
│
├── server/                 API do placar (FastAPI)
├── db/init.sql             Esquema do PostgreSQL
├── tools/                  Versão de terminal, servidor local e testes
└── docs/                   Documentação por assunto
```

Cada módulo de `src/` tem um assunto só, e eles não se conhecem entre si:
`engine` não sabe o que é XP, `progress` não sabe o que é DOM, `api` não sabe
nada do jogo. Toda a costura mora em `app.ts` — é isso que permite testar as
regras e a progressão fora do navegador.

---

## Documentação

| Documento | Assunto |
| --- | --- |
| [docs/vscode.md](docs/vscode.md) | **Passo a passo no VS Code**, do clone ao depurador |
| [docs/docker.md](docs/docker.md) | Subir e parar tudo, e o que fazer quando dá errado |
| [docs/regras-do-jogo.md](docs/regras-do-jogo.md) | Níveis, geração das contas e pontuação |
| [docs/progressao.md](docs/progressao.md) | XP, níveis, ofensiva, estrelas e conquistas |
| [docs/arquitetura.md](docs/arquitetura.md) | Organização das pastas e decisões técnicas |
| [docs/interface.md](docs/interface.md) | Conceito visual, tokens e acessibilidade |
| [docs/api.md](docs/api.md) | Endpoints do placar e validação |
| [docs/banco-de-dados.md](docs/banco-de-dados.md) | Esquema, índices e visões do PostgreSQL |
| [docs/desenvolvimento.md](docs/desenvolvimento.md) | Build, testes, CI e publicação |
| [docs/terminal.md](docs/terminal.md) | A versão em Python |
| [docs/problemas.md](docs/problemas.md) | Erros comuns e como resolver |
| [CHANGELOG.md](CHANGELOG.md) | Histórico de versões |

---

## Tecnologias

| Camada | O quê | Por quê |
| --- | --- | --- |
| Front-end | TypeScript 5, HTML, CSS | Sem framework: o app é pequeno e não precisa de um. Tipos pegam erro de digitação em estado que falharia em silêncio. |
| Build | `tsc` | Única dependência de desenvolvimento. Sem bundler, sem configuração. |
| API | Python 3.12, FastAPI, psycopg 3 | Validação declarativa e documentação automática. |
| Banco | PostgreSQL 16 | Enums e `CHECK` recusam dado impossível na última linha de defesa. |
| Infra | Docker Compose, nginx | Um comando sobe tudo igual em qualquer máquina. |
| Testes | `unittest`, Playwright | Regras testadas sem navegador; a interface, com um de verdade. |

---

## Quem fez

| | |
| --- | --- |
| **Alexandre** — [@xandoqa](https://github.com/xandoqa) | Desenvolvimento e design |
| **Felipe** | Desenvolvimento |

## Licença

[MIT](LICENSE) © 2026 Alexandre e Felipe
