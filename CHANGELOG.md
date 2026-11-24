# Histórico de versões

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
A numeração segue o [Versionamento Semântico](https://semver.org/lang/pt-BR/):
`MAIOR.MENOR.CORREÇÃO`.

- **MAIOR** — mudanças que quebram o que existia antes
- **MENOR** — recursos novos, compatíveis com o que já havia
- **CORREÇÃO** — apenas correções de defeito

---

## [3.0.0] — 2026-11-24

Reformulação da experiência inteira, com progressão real. A versão é maior
porque o app passou a guardar estado entre rodadas e a estrutura de telas
mudou: links e atalhos da v2 não valem mais.

Referência de experiência: o Duolingo. Identidade: própria — paleta violeta,
turquesa e tangerina, botões com aresta que afunda ao apertar, e a capivara
**Capi** no lugar de qualquer coruja.

### Corrigido

- **O `.env` com a senha do banco não estava no `.gitignore`.** O
  `.env.example` instrui `cp .env.example .env`, e qualquer `git add -A`
  depois disso gravaria a senha do PostgreSQL no repositório.
- **A API aceitava qualquer pontuação.** Dez contas valem no máximo 170
  pontos, mas o `CHECK` permitia até 10.000: um `POST` com `pontos: 9999`
  dominava o placar. Agora o teto é calculado e conferido na API e no banco.
- **O botão voltar do navegador saía do app.** Não havia roteamento; agora
  cada tela tem endereço e o histórico funciona, inclusive o gesto de voltar
  do Android.
- **A documentação dizia que a rodada perfeita valia 176 pontos.** São 170 —
  a conta estava errada. Como a API usa esse teto para recusar pontuação
  impossível, o número agora é calculado por `maxScoreFor()`, não fixado.
- **A lição em destaque era um alvo em movimento.** O pulso usava `scale()`
  no próprio botão, o que o torna difícil de acertar para quem tem pouca
  precisão de toque e impossível de clicar para tecnologia assistiva e
  automação. O pulso virou um anel atrás do botão, que fica imóvel.
- `assert` no caminho de produção da API, que `python -O` remove.

### Adicionado

- **Trilha** de 24 lições em 6 unidades, destravando em sequência, com até 3
  estrelas por lição.
- **XP e níveis**, com barra de progresso na barra de estado.
- **Ofensiva** de dias seguidos, virando à meia-noite do fuso local.
- **Cinco vidas** por rodada.
- **19 conquistas**, cada uma ligada a um contador real, com progresso
  parcial visível nas que ainda faltam.
- **Meta diária** de XP: 20, 50 ou 100.
- **Teclado na tela**, para não depender do teclado do sistema no celular.
- **PWA**: instala no celular e abre offline, com service worker que usa
  estratégia diferente por tipo de pedido.
- **Som e vibração**, gerados por WebAudio — nenhum arquivo de áudio para
  baixar — com interruptor no perfil.
- Mascote **Capi**, em SVG inline, com quatro expressões.
- Tela de perfil com estatísticas, ajustes e "começar do zero".
- Documentação nova: [vscode.md](docs/vscode.md) (passo a passo no VS Code),
  [progressao.md](docs/progressao.md), [problemas.md](docs/problemas.md).
- Arquivos do VS Code versionados: F5 sobe o servidor e abre o navegador com
  depuração no TypeScript.
- `favicon.ico` e ícones do PWA em três tamanhos.

### Alterado

- **Navegação refeita**: barra inferior com Trilha, Livre, Medalhas e Eu. O
  treino livre, que ocupava três telas em sequência, virou uma só.
- Tipografia: Baloo 2 nos títulos e interface, Atkinson Hyperlegible nos
  números — ela foi desenhada para não confundir 6 com 8, o que num app de
  cálculo evita que erro de leitura vire erro de resposta.
- O retorno de cada resposta virou um painel que sobe de baixo, com a
  resposta certa e um botão para seguir.
- Os módulos de `src/` foram separados por assunto: `curriculum`, `progress`,
  `router` e `sfx` nasceram nesta versão, e nenhum deles conhece o outro.

### Preservado

- Os recordes da v2 (`bbam:best:*`) continuam sendo lidos e escritos.
- O treino livre, a versão de terminal, o Docker, a API e o banco seguem
  funcionando como antes.
- O site continua abrindo sem backend: sem a API, o placar some e o resto
  funciona igual.

---

## [2.1.0] — 2026-11-02

Placar compartilhado e ambiente em contêiner. Versão menor porque nada do que
existia parou de funcionar: tudo aqui é opcional.

### Adicionado

- **Placar compartilhado** com PostgreSQL 16. As rodadas terminadas passam a
  ser guardadas e viram um ranking por modo, operação e nível.
- **API em Python** (`server/app.py`, FastAPI) com as rotas de saúde, registro
  de rodada, ranking e resumo do jogador, mais documentação interativa em
  `/docs`.
- **Esquema do banco** (`db/init.sql`) com tipos enumerados, restrições
  `CHECK`, índices para a consulta do ranking e três visões
  (`melhores_por_categoria`, `ranking`, `resumo_jogadores`).
- **Docker Compose** com três serviços: banco, API e o site servido por nginx,
  com verificação de saúde e ordem de subida correta.
- **Scripts `iniciar` e `parar`**, em `.sh` e `.bat`, que checam o Docker,
  avisam sobre porta ocupada, esperam cada serviço responder e pedem
  confirmação antes de apagar dados.
- Documentação nova: [docker.md](docs/docker.md),
  [banco-de-dados.md](docs/banco-de-dados.md), [api.md](docs/api.md),
  [terminal.md](docs/terminal.md), [desenvolvimento.md](docs/desenvolvimento.md).
- `.env.example` e `nginx.conf`.

### Alterado

- O site consulta a API antes de mostrar o placar. **Sem backend, o placar
  simplesmente não aparece** e o jogo segue com os recordes locais — é o que
  mantém a publicação no GitHub Pages funcionando sem nenhuma mudança.
- Apelido do jogador guardado localmente, pedido uma vez só.

---

## [2.0.0] — 2026-11-02

Reescrita completa. A versão é maior porque a estrutura de arquivos mudou e os
caminhos antigos deixaram de existir.

### Corrigido

- **Os níveis da tabuada não terminavam nem respeitavam a faixa anunciada.**
  O nível "Fácil (1–10)" começava em 1 e seguia incrementando para sempre; o
  jogador passava de 10, de 50, de 100 e a rodada nunca acabava. Agora cada
  rodada tem dez contas sorteadas dentro da faixa, com tela de resultado no fim.
- **Uma resposta errada travava o jogo.** A conta não avançava e a resposta
  certa nunca era mostrada; só restava acertar ou sair. Agora o erro mostra o
  resultado correto, entra na lista de revisão e a rodada continua.
- **Não dava para responder pelo teclado.** Era preciso clicar no botão a cada
  conta. O campo agora é um formulário: Enter envia e o foco volta sozinho para
  a resposta.
- **Campo vazio contava como resposta.** `Number("")` virava `0` e era
  comparado com o resultado. Agora a entrada é validada antes.
- **Contraste abaixo do mínimo de acessibilidade.** O texto azul `#2769AC`
  sobre o fundo `#6F8AFF` ficava em torno de 1,7:1, muito abaixo dos 4,5:1
  exigidos pela WCAG AA. A paleta foi refeita.
- **Divisão podia exibir contas sem resultado inteiro** em alguns caminhos.
  Agora toda divisão é construída como `a = b × quociente`.

### Adicionado

- Pontuação, sequência de acertos e maior sequência da rodada.
- Tela de resultado com acertos, precisão, tempo e lista de contas para revisar.
- Recordes por modo, operação e nível, salvos no aparelho.
- Modo **Subtração** e modo **Misto** (as quatro operações juntas).
- Tema claro e escuro, acompanhando o sistema, com alternância manual.
- Versão de terminal em Python (`tools/bbam.py`) com as mesmas regras.
- Servidor local de desenvolvimento (`tools/serve.py`).
- Testes das regras do jogo (`tools/test_bbam.py`).
- Integração contínua: checagem de tipos, testes e verificação de que o build
  commitado está atualizado.
- Publicação automática no GitHub Pages.
- `README.md`, documentação por assunto em `docs/`, `LICENSE` (MIT),
  `.gitignore` e `.editorconfig`.
- Créditos a Alexandre e Felipe na interface, no pacote e na licença.

### Alterado

- **A lógica passou a ser escrita em TypeScript** (`src/`), compilada para
  `assets/js/`. As regras ficam em `engine.ts`, sem nenhuma dependência do DOM.
- **Os arquivos saíram da pasta `BeBeTterAtMath(java)` para a raiz.** O nome
  tinha parênteses, maiúsculas irregulares e dizia "java" para um projeto em
  JavaScript; parênteses em caminho de URL ainda atrapalham o GitHub Pages.
- Interface redesenhada sobre o conceito de caderno quadriculado.
- Os `onclick` embutidos no HTML deram lugar a delegação de eventos.
- Os `alert()` dos modos indisponíveis viraram estado desabilitado no botão.

### Removido

- Pasta `BeBeTterAtMath(java)/`.
- Avanço infinito da tabuada.

---

## [1.0.0] — 2026-01-09

Primeira versão publicada.

### Adicionado

- Tela de abertura, menu e navegação entre telas.
- Modo tabuada com três níveis.
- Modo de números aleatórios com soma, multiplicação e divisão.
- Verificação de resposta com mensagem de erro.

[3.0.0]: https://github.com/xandoqa/BeBetterAtMath/releases/tag/v3.0.0
[2.1.0]: https://github.com/xandoqa/BeBetterAtMath/releases/tag/v2.1.0
[2.0.0]: https://github.com/xandoqa/BeBetterAtMath/releases/tag/v2.0.0
[1.0.0]: https://github.com/xandoqa/BeBetterAtMath/releases/tag/v1.0.0
