# Desenvolvimento

Versão 2.1.0

## Rodar o site sozinho

Sem Docker, sem banco, sem placar — só o jogo:

```bash
python3 tools/serve.py --abrir
```

**Não adianta abrir o `index.html` com dois cliques.** O site usa módulos ES, e
o navegador se recusa a carregá-los por `file://`. O erro que aparece
(`CORS policy: Cross origin requests are only supported for...`) não menciona
isso de forma óbvia, então vale lembrar: é sempre o servidor que falta.

## Compilar o TypeScript

A lógica fica em `src/` e é compilada para `assets/js/`.

```bash
npm install        # instala só o compilador
npm run build      # compila uma vez
npm run watch      # recompila a cada alteração
npm run check      # só checa os tipos, sem gerar nada
```

Fluxo normal: `npm run watch` numa aba, `python3 tools/serve.py` noutra.

### O build fica versionado

`assets/js/` **não** está no `.gitignore`. O GitHub Pages serve o repositório
como ele está, e versionar o build evita uma etapa de compilação na publicação.

O risco é fonte e build saírem de sincronia. A integração contínua recompila e
recusa o envio se o resultado for diferente do que está commitado:

```
::error::assets/js está desatualizado.
Rode 'npm run build' e faça commit do resultado.
```

**Então: mexeu em `src/`, rode `npm run build` e faça commit dos dois juntos.**

### Configuração do compilador

O `tsconfig.json` liga mais que o `strict` padrão:

| Opção | O que obriga |
| --- | --- |
| `strict` | Nulos tratados, sem `any` implícito |
| `noUncheckedIndexedAccess` | Tratar o caso de índice ausente em arrays |
| `exactOptionalPropertyTypes` | Não confundir ausente com `undefined` |
| `noUnusedLocals` / `noUnusedParameters` | Nada de sobra |
| `verbatimModuleSyntax` | `import type` explícito para tipos |

## Rodar os testes

```bash
python3 -m unittest discover -s tools -v
```

Os testes cobrem as regras do jogo em `tools/bbam.py`: faixas dos níveis,
divisão exata, subtração não negativa, pontuação, teto da sequência e o
comportamento dos recordes.

## Ambiente completo, com banco

```bash
./iniciar.sh        # Linux e macOS
iniciar.bat         # Windows
```

Detalhes em [docker.md](docker.md).

## Integração contínua

Dois fluxos em `.github/workflows/`:

**`ci.yml`** — roda a cada push e pull request:

1. Checagem de tipos do TypeScript
2. Verificação de que o build commitado está atualizado
3. Testes do Python

**`pages.yml`** — publica no GitHub Pages a cada push na `main`.

Para ligar a publicação, no GitHub: **Settings → Pages → Source → GitHub
Actions**.

O site publicado roda sem backend, então o placar compartilhado não aparece lá
— o que é o comportamento correto, e não uma falha.

## Onde mexer em quê

| Quero mudar | Mexo em |
| --- | --- |
| Uma regra do jogo | `src/engine.ts` **e** `tools/bbam.py` |
| O visual | `assets/css/style.css` |
| Uma tela | `index.html` |
| O que acontece ao clicar | `src/app.ts` |
| Recordes ou tema locais | `src/storage.ts` |
| O placar compartilhado | `src/api.ts` e `server/app.py` |
| O esquema do banco | `db/init.sql` |

As regras do jogo vivem em dois lugares — TypeScript e Python — e precisam
concordar. Ao mudar uma, mude nos dois e atualize
[regras-do-jogo.md](regras-do-jogo.md).

## Versão

A numeração segue [SemVer](https://semver.org/lang/pt-BR/). Ao publicar uma
versão nova, atualize nos cinco lugares:

1. `package.json`
2. `src/engine.ts` (`VERSION`)
3. `tools/bbam.py` (`__version__`)
4. `server/app.py` (`VERSION`)
5. `CHANGELOG.md`

O número aparece para o jogador na tela **Sobre**.

## Convenções

- Código e comentários em português, exceto termos técnicos consagrados
- `.editorconfig` cuida da indentação: 2 espaços, 4 no Python
- Sem `onclick` no HTML — use `data-action` (veja
  [arquitetura.md](arquitetura.md))
- Cores só por variável CSS, nunca valor fixo no componente
