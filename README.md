# Be Better at Math

Treino de cálculo mental em rodadas curtas: dez contas, pontuação por acerto e
pontos extras por sequência. Funciona no navegador, sem instalar nada, e os
recordes ficam salvos no próprio aparelho.

Quem quiser um **placar compartilhado** sobe o ambiente completo com um
comando: `./iniciar.sh` liga o PostgreSQL, a API e o site. É opcional — sem
isso o jogo funciona igual, só com os recordes locais.

**Versão 2.1.0** · Desenvolvido por **Alexandre** e **Felipe**

---

## O que dá para treinar

| Modo | O que faz | Níveis |
| --- | --- | --- |
| **Tabuada** | Multiplicação com o primeiro fator dentro da faixa do nível | Fácil 1–10 · Médio 10–50 · Difícil 50–100 |
| **Números aleatórios** | Soma, subtração, multiplicação, divisão ou as quatro misturadas | Fácil 1–10 · Médio 10–50 · Difícil 50–100 |
| Sudoku | Em desenvolvimento | — |
| Lógica | Em desenvolvimento | — |

A divisão sempre fecha em número inteiro e a subtração nunca dá negativo — as
contas são montadas de trás para frente para garantir isso.

## Como abrir

### Só o jogo (precisa de Python)

O site é feito de arquivos estáticos, mas usa módulos ES. Por isso **não basta
dar dois cliques no `index.html`**: o navegador bloqueia módulos carregados por
`file://`. Use o servidor local:

```bash
python3 tools/serve.py --abrir
```

E pronto: <http://localhost:8000>.

### Tudo, com placar compartilhado (precisa de Docker)

```bash
./iniciar.sh        # Linux e macOS
iniciar.bat         # Windows
```

Sobe o PostgreSQL, a API e o site de uma vez. Quando terminar:

| | |
| --- | --- |
| site | <http://localhost:8080> |
| API | <http://localhost:8000/api/saude> |
| documentação da API | <http://localhost:8000/docs> |

Para desligar:

```bash
./parar.sh          # mantém os dados
./parar.sh --apagar-dados   # apaga o banco também
```

Os `.bat` aceitam as mesmas opções. Detalhes em [docs/docker.md](docs/docker.md).

## Como mexer no código

A lógica do jogo é escrita em **TypeScript**, em `src/`, e compilada para
`assets/js/`. O resultado da compilação fica versionado no repositório, de modo
que o site publicado não depende de nenhuma etapa de build.

```bash
npm install        # instala só o compilador TypeScript
npm run build      # compila src/ → assets/js/
npm run watch      # recompila a cada alteração
npm run check      # só checa os tipos, sem gerar arquivos
```

> Depois de editar qualquer arquivo em `src/`, rode `npm run build` e faça
> commit do `assets/js/` junto. A integração contínua recusa o envio se os dois
> estiverem fora de sincronia.

## Versão de terminal

A mesma mecânica, em Python puro, sem dependências:

```bash
python3 tools/bbam.py
python3 tools/bbam.py --modo tabuada --nivel facil
python3 tools/bbam.py --modo aleatorio --operacao div --nivel medio
```

Testes:

```bash
python3 -m unittest discover -s tools -v
```

## Estrutura

```
.
├── index.html              Todas as telas do app
├── iniciar.sh / .bat       Sobe o ambiente completo
├── parar.sh / .bat         Desliga
├── docker-compose.yml      Banco, API e site
├── assets/
│   ├── css/style.css       Estilos e design tokens
│   └── js/                 Build gerado a partir de src/ (versionado)
├── src/
│   ├── engine.ts           Regras do jogo, sem DOM
│   ├── storage.ts          Recordes e tema no localStorage
│   ├── api.ts              Cliente do placar (tolerante a falha)
│   └── app.ts              Ligação entre as regras e a tela
├── server/
│   ├── app.py              API do placar (FastAPI)
│   └── Dockerfile
├── db/init.sql             Esquema do PostgreSQL
├── tools/
│   ├── bbam.py             Versão de terminal
│   ├── serve.py            Servidor local de desenvolvimento
│   └── test_bbam.py        Testes das regras
└── docs/                   Documentação por assunto
```

## Documentação

| Documento | Assunto |
| --- | --- |
| [docs/regras-do-jogo.md](docs/regras-do-jogo.md) | Níveis, geração das contas e pontuação |
| [docs/arquitetura.md](docs/arquitetura.md) | Organização das pastas e decisões técnicas |
| [docs/interface.md](docs/interface.md) | Conceito visual, tokens e acessibilidade |
| [docs/desenvolvimento.md](docs/desenvolvimento.md) | Build, testes, CI e publicação |
| [docs/docker.md](docs/docker.md) | Subir e parar tudo, e o que fazer quando dá errado |
| [docs/banco-de-dados.md](docs/banco-de-dados.md) | Esquema, índices e visões do PostgreSQL |
| [docs/api.md](docs/api.md) | Rotas do placar e validação |
| [docs/terminal.md](docs/terminal.md) | A versão em Python |
| [CHANGELOG.md](CHANGELOG.md) | Histórico de versões |

## Licença

[MIT](LICENSE) © 2026 Alexandre e Felipe
