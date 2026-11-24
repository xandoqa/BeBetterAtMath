# Segurança

## Como avisar sobre uma falha

Achou algo? Abra uma
[Security Advisory privada](https://github.com/xandoqa/BeBetterAtMath/security/advisories/new)
— não uma issue pública, que deixaria a falha visível antes da correção.

Conte o que dá para fazer com ela e como reproduzir. A resposta costuma
sair em alguns dias; este é um projeto de estudo, tocado por duas pessoas.

---

## O que está protegido

### Segredos

- **O `.env` nunca é versionado.** `.gitignore` barra `.env` e `.env.*`,
  liberando só o `.env.example`, que é modelo sem senha utilizável.
- **O `./iniciar.sh` gera uma senha aleatória de 24 caracteres** na
  primeira execução, com permissão `600`. Não existe senha padrão: o
  `docker-compose.yml` recusa subir sem `POSTGRES_PASSWORD`, porque um
  banco com senha `bbam` é um banco sem senha.
- **Um gancho de pre-commit trava segredo antes do commit.** Instale com:

  ```bash
  python3 tools/instalar_hooks.py
  ```

  Ele roda `tools/checar_segredos.py`, que procura chave privada, token
  de GitHub/AWS/Slack/OpenAI/Anthropic, URL com senha embutida e senha
  literal em código. A mesma verificação roda na CI, sobre o histórico
  inteiro.

### A API do placar

- **Pontuação impossível é recusada.** O cliente é o navegador de quem
  joga: nada impede um `curl` com `pontos: 9999`. A API calcula o máximo
  real da rodada e recusa com 422; o banco reforça com
  `pontos <= total * 20`.
- **Limite de 30 requisições por minuto, por IP**, no endpoint de
  escrita. Atrás do nginx, o IP real vem do `X-Forwarded-For`.
- **CORS fechado por padrão** no localhost do compose. Liberar outras
  origens é uma decisão explícita, via `CORS_ORIGINS`.
- **Consultas sempre parametrizadas** (`%s` do psycopg). Não há
  concatenação de SQL em lugar nenhum.
- **Enums e `CHECK` no banco** recusam modo, nível, operação ou número
  impossível, mesmo que a API tenha um defeito.

### O site

- **Nada de `innerHTML`.** Todo texto vindo de fora — apelido no placar,
  acima de tudo — entra por `textContent` ou `createElement`. Não há
  caminho de XSS por conteúdo de jogador.
- **Política de conteúdo restritiva** no nginx: `script-src 'self'`, sem
  `unsafe-inline` para script, `frame-ancestors 'none'` contra
  clickjacking, e `object-src 'none'`.
- **Nenhum dado pessoal sai do aparelho.** Progresso e recordes ficam no
  `localStorage`. Só o apelido vai para o servidor, e só se você entrar
  no placar.

### Os contêineres

- A API **não roda como root** e tem sistema de arquivos **somente
  leitura**, com `/tmp` em memória.
- Os três serviços sobem com `no-new-privileges`.
- **O PostgreSQL só escuta em `127.0.0.1`.** Sem isso, o Docker publica
  em todas as interfaces, e numa rede compartilhada qualquer um alcança
  o banco.
- Versões fixadas: `postgres:16-alpine`, `nginx:1.27-alpine`,
  `python:3.12-slim`, `typescript@7.0.2`. O Dependabot avisa quando sai
  correção.

---

## Limitações conhecidas

Preferimos listar do que fingir que não existem.

**O placar não tem autenticação.** Você escolhe um apelido e pronto —
não há senha. Então dá para enviar pontuação usando o apelido de outra
pessoa. É deliberado: pedir cadastro num treino de tabuada afasta mais
gente do que protege, e o pior resultado é um placar de brincadeira
sujo. Se o placar passar a valer alguma coisa, precisa de conta de
verdade.

**O limite de requisições é por processo.** Com várias réplicas da API,
o teto efetivo vira `30 × número de réplicas`. Para um deploy sério, o
contador precisa sair da memória e ir para o Redis.

**A pontuação é calculada no cliente.** A API recusa o impossível, mas
não o improvável: alguém pode enviar 170 pontos sem ter jogado. Validar
de verdade exigiria o servidor gerar e conferir cada conta.

**O `CORS_ORIGINS=*` continua possível.** Não bloqueamos, porque há
casos legítimos — mas deixou de ser o padrão.

**O `docker-compose.yml` é para desenvolvimento.** Falta TLS, segredos
em cofre e backup automático. Num servidor exposto, nada disso é
opcional.

---

## Para publicar em algum lugar de verdade

1. Senha forte no `.env`, nunca a de exemplo
2. `CORS_ORIGINS` com o endereço real, sem `*`
3. HTTPS na frente (Caddy ou nginx com certificado)
4. Remover a publicação da porta `5432` — a API fala com o banco pela
   rede interna do compose
5. Backup do volume (`pg_dump`, ver [docs/banco-de-dados.md](docs/banco-de-dados.md))
6. `RATE_LIMIT` ajustado ao tráfego esperado

---

## Se um segredo vazar

Tirar do próximo commit **não basta**: o valor continua recuperável no
histórico, e quem clonou antes já o tem.

1. **Troque o segredo.** É o único passo que realmente resolve.
2. Para a senha do banco: `./parar.sh --apagar-dados`, apague o `.env` e
   rode `./iniciar.sh` para gerar outra.
3. Só então pense em limpar o histórico
   ([git-filter-repo](https://github.com/newren/git-filter-repo)), ciente
   de que isso reescreve os commits e exige force push.
