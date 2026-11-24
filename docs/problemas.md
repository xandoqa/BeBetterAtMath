# Erros comuns e como resolver

Versão 3.0.0

---

## O site

### A página abre em branco, ou os botões não fazem nada

Quase sempre é o `index.html` aberto com dois cliques, direto do disco.

O app usa módulos ES, e o navegador **recusa** módulos carregados por
`file://`. O console mostra algo como:

```
Access to script at 'file:///.../app.js' from origin 'null' has been
blocked by CORS policy
```

A mensagem fala de CORS e não deixa a causa óbvia, mas é sempre a falta do
servidor. Rode:

```bash
python3 tools/serve.py --abrir
```

### Mudei o TypeScript e a página continua igual

Falta compilar. `src/` é a fonte; o navegador lê `assets/js/`:

```bash
npm run build      # ou deixe `npm run watch` ligado
```

Se ainda assim não mudar, é cache: recarregue com **Ctrl+Shift+R**
(**⇧⌘R** no Mac).

### Mudei um arquivo e o app continua servindo a versão velha

O service worker guarda os arquivos para o app abrir offline. Em
desenvolvimento, isso atrapalha.

No Chrome: **F12 → Application → Service Workers → Update on reload**. Ou
**Application → Storage → Clear site data**.

### As fontes não carregam

O app busca Baloo 2 e Atkinson Hyperlegible no Google Fonts. Sem internet, ou
atrás de um proxy que bloqueie, o navegador cai nas fontes do sistema. O app
continua funcionando — só fica com outra cara.

### O progresso some a cada recarregamento

O navegador não está deixando guardar dados. Acontece em janela anônima, com
cookies/dados de site bloqueados, ou com extensões de privacidade agressivas.

O app detecta isso e avisa na tela **Eu**. Fora da janela anônima, libere os
dados do site nas configurações do navegador.

### O placar compartilhado não aparece

Ele só aparece quando a API responde. Sem Docker rodando, fica escondido de
propósito — e aparece um `404 /api/saude` no console, que é o app checando.

Para ligar: `./iniciar.sh`. Para conferir:
<http://localhost:8000/api/saude>. Se devolver `"banco": false`, a API está
no ar mas não conversa com o Postgres.

---

## Python

### `python3: command not found` (Windows)

No Windows o comando é `python`, sem o 3:

```bat
python tools\serve.py
```

Se nem assim funcionar, o Python foi instalado sem marcar **"Add python.exe
to PATH"**. Reinstale marcando a caixa na primeira tela.

### `Address already in use` / `A porta 8000 já está em uso`

Outro programa ocupou a porta. Use outra:

```bash
python3 tools/serve.py --porta 3000
```

Para descobrir quem está lá:

```bash
lsof -i :8000                      # Linux e macOS
netstat -ano | findstr :8000       # Windows
```

---

## Node e TypeScript

### `npm: command not found`

O Node.js não está instalado, ou não entrou no PATH. Baixe em
<https://nodejs.org/> (versão LTS) e abra um terminal novo — o PATH só
atualiza em terminais abertos depois da instalação.

### A CI reclama que `assets/js` está desatualizado

```
::error::assets/js está desatualizado.
Rode 'npm run build' e faça commit do resultado.
```

A fonte em `src/` foi alterada sem recompilar. Rode `npm run build` e inclua
`assets/js/` no commit.

### `tsc` acusa erro em arquivo que eu nem mexi

O `tsconfig.json` liga checagens estritas (`noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes`). Ao mudar um tipo em `engine.ts`, por exemplo,
quem usa aquele tipo passa a não compilar — que é justamente o ponto: o erro
aparece na hora, não em produção.

---

## Docker

### "O Docker está instalado, mas o serviço não está rodando"

Abra o Docker Desktop e espere o ícone ficar **verde**. No Linux:

```bash
sudo systemctl start docker
```

### "A porta 8080 já está em uso"

Mude no `.env`:

```env
WEB_PORT=3000
API_PORT=3001
POSTGRES_PORT=5433
```

Depois `./parar.sh && ./iniciar.sh`.

### A API não sobe

```bash
docker compose logs api
```

Na primeira vez, quase sempre é o banco ainda inicializando — esperar
resolve. O `iniciar.sh` já espera, mas um computador lento pode estourar os
60 segundos.

### Mudei o `db/init.sql` e nada mudou

Aquele arquivo roda **uma vez só**, quando o volume do Postgres está vazio.
Com o banco já criado, editar não surte efeito.

```bash
./parar.sh --apagar-dados && ./iniciar.sh
```

Isso apaga os dados. Para um ambiente com dados que importam, seria preciso
uma ferramenta de migração (Alembic, por exemplo) — o projeto ainda não tem
uma, porque ainda não precisou.

### `permission denied: ./iniciar.sh`

O arquivo perdeu a permissão de execução:

```bash
chmod +x iniciar.sh parar.sh
```

---

## Git e GitHub

### O site publicado no GitHub Pages não atualiza

A publicação roda a cada push na `main`. Confira em **Actions** se o fluxo
"Publicar no GitHub Pages" passou, e em **Settings → Pages** se a origem está
em **GitHub Actions**.

Se passou e mesmo assim não mudou, é cache do navegador ou do service worker:
**Ctrl+Shift+R**.

### Commitei o `.env` por engano

O `.gitignore` barra `.env`, mas se ele entrou antes dessa regra:

```bash
git rm --cached .env
git commit -m "Remove .env do versionamento"
```

> Isso tira dos commits futuros, **não do histórico**. Se havia senha de
> verdade ali, troque a senha — considere-a exposta.

---

## Ainda travado?

Abra uma issue em
<https://github.com/xandoqa/BeBetterAtMath/issues> dizendo:

1. O que você tentou fazer
2. O que apareceu (mensagem de erro inteira, ou print)
3. Sistema operacional e navegador
4. Saída de `python3 --version` e `node --version`
