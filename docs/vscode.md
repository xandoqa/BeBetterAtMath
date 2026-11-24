# Rodando o projeto no VS Code

Versão 3.0.0

Passo a passo do zero. Serve para Windows, macOS e Linux, e não pressupõe nada
além de saber abrir um terminal.

---

## 1. O que instalar antes

| Programa | Para quê | Obrigatório? |
| --- | --- | --- |
| [Git](https://git-scm.com/downloads) | Baixar o projeto | Sim |
| [VS Code](https://code.visualstudio.com/) | Editar | Sim |
| [Python 3.10+](https://www.python.org/downloads/) | Servidor local e versão de terminal | Sim |
| [Node.js 20+](https://nodejs.org/) | Compilar o TypeScript | Só para mexer em `src/` |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Banco e placar | Só para o placar |

> **No Windows**, ao instalar o Python marque a caixa
> **"Add python.exe to PATH"** na primeira tela. Sem isso o comando `python`
> não funciona no terminal e você vai esbarrar nisso no passo 4.

Para conferir se deu certo, abra o terminal e rode:

```bash
git --version
python3 --version    # no Windows: python --version
node --version       # opcional
```

Se os três responderem com um número de versão, está pronto.

---

## 2. Baixar o projeto

```bash
git clone https://github.com/xandoqa/BeBetterAtMath.git
cd BeBetterAtMath
```

---

## 3. Abrir no VS Code

```bash
code .
```

Se o comando `code` não existir, abra o VS Code pelo menu e use
**Arquivo → Abrir Pasta**, escolhendo a pasta `BeBetterAtMath`.

Ao abrir, o VS Code vai sugerir instalar algumas extensões recomendadas
(elas estão listadas em `.vscode/extensions.json`). Aceite — nenhuma é
obrigatória, mas todas ajudam:

| Extensão | Para quê |
| --- | --- |
| **Python** | Roda e depura `tools/bbam.py` e a API |
| **Live Preview** | Vê o site dentro do próprio VS Code |
| **Docker** | Liga e desliga os contêineres pela barra lateral |
| **EditorConfig** | Respeita a indentação do projeto automaticamente |

---

## 4. Rodar o site

### Pelo VS Code (mais fácil)

1. Aperte **Ctrl+Shift+D** (ou **⇧⌘D** no Mac) para abrir "Executar e Depurar".
2. No alto, escolha **"Abrir o site (Chrome)"**.
3. Aperte **F5**.

O servidor sobe sozinho e o navegador abre no endereço certo. Para parar,
use o quadrado vermelho na barra de depuração.

### Pelo terminal

Abra o terminal integrado com **Ctrl+'** (crase) e rode:

```bash
python3 tools/serve.py --abrir
```

E acesse <http://localhost:8000>.

> **Não abra o `index.html` com dois cliques.** O app usa módulos ES, e o
> navegador bloqueia módulos vindos de `file://`. O erro fala de CORS e não
> deixa isso óbvio; a causa é sempre a falta do servidor.

---

## 5. Mexer no código

### Só no visual ou nas telas

Edite `index.html` ou `assets/css/style.css`, salve e recarregue a página.
Não precisa compilar nada — o servidor já serve sem cache.

### Na lógica do jogo

A lógica fica em `src/*.ts` e precisa ser compilada:

```bash
npm install        # uma vez só
npm run watch      # deixe rodando num terminal
```

Com o `watch` ligado, cada vez que você salvar um `.ts` ele recompila para
`assets/js/`. Aí é só recarregar a página.

> **Antes de commitar:** rode `npm run build` e inclua `assets/js/` no commit.
> A CI recusa o push se a fonte e o build estiverem fora de sincronia.

Use **dois terminais** no VS Code (o botão `+` no painel do terminal): um com
`npm run watch`, outro com `python3 tools/serve.py`.

---

## 6. Depurar

### O site, no navegador

Com a configuração **"Abrir o site (Chrome)"** (passo 4), os pontos de parada
que você colocar nos arquivos `.ts` funcionam direto — o `tsconfig.json` gera
*source maps*, então o VS Code mostra seu TypeScript, não o JavaScript
compilado.

Clique na margem esquerda de qualquer linha de `src/app.ts` para criar um
ponto de parada e jogue uma rodada.

### A versão de terminal

Escolha **"Jogar no terminal (Python)"** em "Executar e Depurar" e aperte F5.

### A API do placar

Escolha **"API do placar (FastAPI)"**. Ela precisa do banco no ar:

```bash
docker compose up -d db
```

---

## 7. Rodar os testes

```bash
npm test
```

Ou, direto:

```bash
python3 -m unittest discover -s tools -v
```

São 14 testes sobre as regras do jogo: faixas dos níveis, divisão exata,
subtração não negativa, pontuação e recordes.

---

## 8. Subir o ambiente completo

Com o Docker Desktop **aberto e com o ícone verde**:

```bash
./iniciar.sh        # Linux e macOS
iniciar.bat         # Windows
```

Na primeira vez leva alguns minutos para baixar as imagens. Depois:

| | |
| --- | --- |
| site | <http://localhost:8080> |
| API | <http://localhost:8000/api/saude> |
| documentação da API | <http://localhost:8000/docs> |

Para desligar: `./parar.sh` (ou `parar.bat`).

### Variáveis de ambiente

Tudo tem valor padrão, então o projeto sobe sem configurar nada. Para mudar
alguma coisa:

```bash
cp .env.example .env
```

| Variável | Padrão | Para quê |
| --- | --- | --- |
| `POSTGRES_USER` | `bbam` | Usuário do banco |
| `POSTGRES_PASSWORD` | `bbam` | Senha do banco |
| `POSTGRES_DB` | `bbam` | Nome do banco |
| `POSTGRES_PORT` | `5432` | Porta do banco |
| `API_PORT` | `8000` | Porta da API |
| `WEB_PORT` | `8080` | Porta do site |
| `CORS_ORIGINS` | `*` | Origens liberadas na API |

> O `.env` **não é versionado** — está no `.gitignore` de propósito, porque
> guarda a senha. Só o `.env.example`, que não tem segredo nenhum, vai para o
> repositório. Em produção, troque a senha padrão e o `CORS_ORIGINS=*` pelo
> endereço real do site.

---

## 9. Quando algo dá errado

A lista completa está em [problemas.md](problemas.md). Os três mais comuns
no VS Code:

**`python3` não é reconhecido (Windows)** — no Windows o comando é `python`,
sem o 3. Se nem assim funcionar, o Python foi instalado sem marcar "Add
python.exe to PATH": reinstale marcando a caixa.

**A porta 8000 já está em uso** — outro programa está nela. Use outra:
`python3 tools/serve.py --porta 3000`.

**Mudei o `.ts` e a página não muda** — falta compilar. Rode `npm run build`,
ou deixe `npm run watch` ligado. Se ainda assim não mudar, recarregue com
**Ctrl+Shift+R** para ignorar o cache.
