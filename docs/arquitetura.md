# Arquitetura

Versão 2.1.0

## Visão geral

O projeto é um site estático. Não há servidor, banco de dados nem conta de
usuário: tudo acontece no navegador e os dados ficam no aparelho.

```
index.html  ─ carrega ─>  assets/js/app.js   (módulo ES)
                                │
                                ├─ importa ─> engine.js    regras do jogo
                                └─ importa ─> storage.js   recordes e tema
```

## Pastas

```
.
├── index.html              Todas as telas, em seções com data-screen
├── assets/
│   ├── css/style.css       Tokens, componentes e temas
│   └── js/                 Build gerado a partir de src/ (versionado)
├── src/
│   ├── engine.ts           Regras puras, sem DOM
│   ├── storage.ts          localStorage com proteção contra falha
│   └── app.ts              Estado da partida e ligação com a tela
├── tools/
│   ├── bbam.py             Versão de terminal
│   ├── serve.py            Servidor local
│   └── test_bbam.py        Testes das regras
├── docs/                   Esta documentação
└── .github/workflows/      Integração contínua e publicação
```

## Decisões

### Por que TypeScript

O projeto original tinha estados representados por texto solto — `'easy'`,
`'mul'`, `'sum'` — comparados com `if` espalhados. Um erro de digitação em
qualquer um deles falhava em silêncio: a conta simplesmente não era gerada.

Com tipos, `Level` e `Operation` são conjuntos fechados, e o `switch` sobre
operações é verificado na compilação. O `tsconfig.json` liga `strict`,
`noUncheckedIndexedAccess` e `exactOptionalPropertyTypes`, então acessar um
índice de array já obriga a tratar o caso ausente.

### Por que o build fica versionado

`assets/js/` está **fora** do `.gitignore`, de propósito. O GitHub Pages serve
o repositório como ele está; versionar o build evita uma etapa de compilação na
publicação e mantém o site funcionando mesmo para quem clona sem Node.

O preço é que fonte e build podem sair de sincronia. A integração contínua
cobre isso: ela recompila e recusa o envio se o resultado for diferente do que
está commitado.

### Por que as regras ficam separadas do DOM

`engine.ts` não toca em `document`. Isso permite testá-lo fora do navegador e
foi o que tornou possível reescrever as mesmas regras em Python sem
ambiguidade: o arquivo é a especificação.

### Por que módulos ES em vez de um arquivo só

Três arquivos pequenos com responsabilidade clara valem mais que um
`app.js` de quatrocentas linhas. O custo é que o site precisa ser servido por
HTTP — daí o `tools/serve.py`.

### Por que o estado vive num único objeto

Na versão 1.0.0 o estado eram variáveis globais soltas (`currentA`, `randType`,
`randA`...), e sair de um modo para outro deixava sobras do anterior. Agora há
um só objeto `GameState`, criado no início da rodada e descartado no fim.

## Telas

Cada tela é uma `<section data-screen="nome">`. `showScreen(nome)` mostra uma e
esconde as outras, usando o atributo `hidden` — que também remove o conteúdo da
árvore de acessibilidade, coisa que `display: none` por classe nem sempre
garante em todos os leitores de tela.

```
splash → menu ┬→ tabuadaConfig ──────────────→ game → results
              ├→ randomConfig → randomLevel ─↗
              └→ about
```

## Eventos

Não há `onclick` no HTML. Um único ouvinte no `document` lê o atributo
`data-action` do elemento mais próximo e decide o que fazer. Adicionar um botão
novo é adicionar um `data-action`, sem mexer na ligação de eventos.

| `data-action` | Efeito |
| --- | --- |
| `goto` | Vai para a tela em `data-target` |
| `pick-op` | Guarda a operação de `data-op` e segue para o nível |
| `start` | Começa a rodada com `data-mode` e `data-level` |
| `again` | Repete a rodada com a mesma configuração |
| `quit` | Abandona a rodada e volta ao menu |
| `toggle-theme` | Alterna automático → claro → escuro |
| `reset-records` | Apaga os recordes, com confirmação |

## Armazenamento

Chaves no `localStorage`:

| Chave | Conteúdo |
| --- | --- |
| `bbam:best:<modo>:<operação>:<nível>` | JSON com pontuação, acertos, tempo e data |
| `bbam:theme` | `auto`, `light` ou `dark` |

Todo acesso passa por `try/catch`. Em janela anônima ou com os dados do site
bloqueados, o `localStorage` **lança uma exceção** em vez de devolver vazio, e
o jogo precisa continuar funcionando sem ele — apenas sem guardar nada.
