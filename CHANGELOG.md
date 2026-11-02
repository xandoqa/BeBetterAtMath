# Histórico de versões

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
A numeração segue o [Versionamento Semântico](https://semver.org/lang/pt-BR/):
`MAIOR.MENOR.CORREÇÃO`.

- **MAIOR** — mudanças que quebram o que existia antes
- **MENOR** — recursos novos, compatíveis com o que já havia
- **CORREÇÃO** — apenas correções de defeito

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

[2.1.0]: https://github.com/xandoqa/BeBetterAtMath/releases/tag/v2.1.0
[2.0.0]: https://github.com/xandoqa/BeBetterAtMath/releases/tag/v2.0.0
[1.0.0]: https://github.com/xandoqa/BeBetterAtMath/releases/tag/v1.0.0
