# API do placar

Versão 2.1.0 · FastAPI + psycopg 3

Recebe as rodadas terminadas e devolve o ranking. Fica em `server/app.py`.

Com o ambiente no ar, a documentação interativa gerada pelo próprio FastAPI
está em <http://localhost:8000/docs> — dá para disparar as chamadas por lá.

## A regra que governa tudo aqui

**A API é opcional.** O jogo precisa continuar funcionando com ela desligada,
e é isso que o cliente em `src/api.ts` garante: toda chamada tem tempo limite
de 3 segundos e devolve `null` em qualquer falha — API fora do ar, sem rede,
CORS barrado, tempo esgotado. Nenhum desses casos é erro do ponto de vista de
quem está jogando; o placar simplesmente não aparece.

Por isso nada que dependa da API pode travar uma tela.

## Rotas

### `GET /api/saude`

Diz se o serviço e o banco estão de pé. É o que o Docker usa no healthcheck e
o que o site consulta antes de mostrar o placar.

```json
{ "status": "ok", "versao": "2.1.0", "banco": true }
```

`status` vira `"degradado"` e `banco` vira `false` quando a API está no ar mas
não consegue falar com o Postgres.

### `POST /api/rodadas`

Guarda uma rodada terminada.

```json
{
  "apelido": "Alexandre",
  "modo": "tabuada",
  "nivel": "easy",
  "operacao": "mul",
  "pontos": 176,
  "acertos": 10,
  "total": 10,
  "maior_seq": 10,
  "duracao_ms": 38000
}
```

Resposta `201`:

```json
{ "id": 42, "posicao": 1, "melhor_pessoal": 176 }
```

`posicao` é a colocação do jogador naquela categoria depois desta rodada.

O jogador é criado na primeira vez e reaproveitado nas seguintes, por um
`INSERT ... ON CONFLICT (lower(apelido)) DO UPDATE`, numa consulta só.

### `GET /api/ranking`

| Parâmetro | Padrão | Valores |
| --- | --- | --- |
| `modo` | `tabuada` | `tabuada`, `random` |
| `operacao` | `mul` | `sum`, `sub`, `mul`, `div`, `mix` |
| `nivel` | `easy` | `easy`, `medium`, `hard` |
| `limite` | `10` | 1 a 100 |

```
GET /api/ranking?modo=random&operacao=div&nivel=medium&limite=5
```

```json
[
  { "posicao": 1, "apelido": "Alexandre", "pontos": 176,
    "acertos": 10, "total": 10, "maior_seq": 10, "duracao_ms": 38000 }
]
```

### `GET /api/jogadores/{apelido}`

Resumo de um jogador: rodadas, pontos totais, melhor rodada, maior sequência e
quando jogou pela última vez. Responde `404` se o apelido não existe.

## Validação em três camadas

A mesma regra é checada três vezes, de propósito, porque cada camada protege de
uma coisa diferente:

| Camada | Protege de |
| --- | --- |
| `src/api.ts` (navegador) | Erro de digitação do jogador |
| Pydantic (`RodadaEntrada`) | Requisição malformada vinda de qualquer lugar |
| `CHECK` no Postgres | Uma regressão na própria API |

A validação do navegador é conveniência, não segurança: qualquer um pode chamar
a API direto. Quem de fato garante é o banco.

## Conexões

O pool (`psycopg_pool.AsyncConnectionPool`) é aberto no `lifespan` da aplicação
e fechado no encerramento, com 1 a 10 conexões. Abrir uma conexão por
requisição seria mais simples e bem mais lento: o custo de handshake do
Postgres apareceria em cada chamada.

## Configuração

Tudo por variável de ambiente, com padrão que funciona no Docker:

| Variável | Padrão | Para quê |
| --- | --- | --- |
| `DATABASE_URL` | — | URL completa; tem prioridade sobre as abaixo |
| `POSTGRES_USER` | `bbam` | |
| `POSTGRES_PASSWORD` | `bbam` | |
| `POSTGRES_HOST` | `db` | Nome do serviço no compose |
| `POSTGRES_PORT` | `5432` | |
| `POSTGRES_DB` | `bbam` | |
| `CORS_ORIGINS` | `*` | Origens liberadas, separadas por vírgula |

> Em produção, troque o `CORS_ORIGINS=*` pelo endereço real do site e a senha
> padrão por uma de verdade. Os valores atuais servem para desenvolvimento
> local e nada além disso.

## Rodar fora do Docker

```bash
cd server
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

export DATABASE_URL=postgresql://bbam:bbam@localhost:5432/bbam
uvicorn app:app --reload --port 8000
```

O banco ainda precisa estar de pé. Para subir só ele:

```bash
docker compose up -d db
```

## Apontar o site para outra API

Por padrão o site chama `/api` na mesma origem. Para mudar, acrescente no
`index.html`:

```html
<meta name="bbam-api" content="https://o-endereco-da-api/api" />
```

É o que permite o site no GitHub Pages conversar com uma API hospedada em
outro lugar — e, sem isso, o placar fica escondido, que é o comportamento
correto quando não há backend.
