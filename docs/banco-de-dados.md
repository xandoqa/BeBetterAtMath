# Banco de dados

Versão 2.1.0 · PostgreSQL 16

## Por que existe

Os recordes do jogo ficam no aparelho: trocou de celular, perdeu tudo, e não
há como comparar sua pontuação com a de mais ninguém. O banco existe para
resolver só isso — um **placar compartilhado**.

Ele é opcional. O jogo nunca depende dele para funcionar.

## Esquema

```
jogadores ──< rodadas
    │             │
    └─────────────┴──> melhores_por_categoria ──> ranking
                  └──> resumo_jogadores
```

### `jogadores`

| Coluna | Tipo | Observação |
| --- | --- | --- |
| `id` | `BIGINT` | Gerado pelo banco |
| `apelido` | `TEXT` | Entre 2 e 24 caracteres, sem espaço nas pontas |
| `criado_em` | `TIMESTAMPTZ` | |

Não há senha nem e-mail. O jogador escolhe um apelido e pronto: é um treino de
tabuada, não vale guardar dado pessoal que não precisa.

Um índice único sobre `lower(apelido)` faz com que "Alexandre" e "alexandre"
sejam a mesma pessoa no placar.

### `rodadas`

| Coluna | Tipo | Observação |
| --- | --- | --- |
| `id` | `BIGINT` | |
| `jogador_id` | `BIGINT` | `ON DELETE CASCADE` |
| `modo` | `modo_jogo` | `tabuada` ou `random` |
| `nivel` | `nivel_jogo` | `easy`, `medium`, `hard` |
| `operacao` | `operacao_jogo` | `sum`, `sub`, `mul`, `div`, `mix` |
| `pontos` | `INTEGER` | |
| `acertos` | `SMALLINT` | Nunca maior que `total` |
| `total` | `SMALLINT` | |
| `maior_seq` | `SMALLINT` | |
| `duracao_ms` | `INTEGER` | |
| `criado_em` | `TIMESTAMPTZ` | |

**Cada rodada terminada vira uma linha**, e não só o recorde. Guardar o
histórico inteiro custa pouco — são dez contas por linha — e permite montar
qualquer ranking depois sem ter perdido informação no caminho.

## Duas decisões

### Enums em vez de texto

`modo`, `nivel` e `operacao` são tipos enumerados. Se a API tentar gravar um
nível que não existe, o banco recusa:

```
ERROR: invalid input value for enum nivel_jogo: "impossivel"
```

Com `TEXT`, isso entraria em silêncio e só apareceria como uma categoria
fantasma no ranking, semanas depois.

### Restrições `CHECK`

O banco é a última linha de defesa. A API já valida com Pydantic, mas uma
regressão lá não pode produzir dados impossíveis aqui:

| Restrição | Impede |
| --- | --- |
| `acertos_validos` | Acertar mais contas do que a rodada tem |
| `total_valido` | Rodada de 0 ou de 500 contas |
| `sequencia_valida` | Sequência maior que o número de contas |
| `pontos_validos` | Pontuação negativa ou absurda |
| `duracao_valida` | Duração negativa ou maior que um dia |

## Índices

| Índice | Para quê |
| --- | --- |
| `rodadas_ranking` | `(modo, operacao, nivel, pontos DESC, duracao_ms ASC)` — a consulta do ranking |
| `rodadas_por_jogador` | `(jogador_id, criado_em DESC)` — o histórico de um jogador |
| `jogadores_apelido_unico` | `lower(apelido)` — unicidade sem diferenciar maiúsculas |

A ordem das colunas do primeiro índice é a mesma da consulta do ranking:
filtra pelas três primeiras, ordena pelas duas últimas. Assim o Postgres lê o
índice e já sai ordenado.

## Visões

### `melhores_por_categoria`

A melhor rodada de cada jogador em cada categoria, usando `DISTINCT ON` —
recurso específico do Postgres que evita a subconsulta com `MAX` e o join de
volta. Empate em pontos é desempatado pelo **menor tempo**.

### `ranking`

O placar como aparece na tela. Usa `RANK() OVER (PARTITION BY ...)` para numerar
as posições dentro de cada categoria.

```sql
SELECT posicao, apelido, pontos
  FROM ranking
 WHERE modo = 'tabuada' AND operacao = 'mul' AND nivel = 'easy'
 ORDER BY posicao
 LIMIT 10;
```

### `resumo_jogadores`

Tudo o que cada jogador já fez, somado: rodadas, pontos totais, melhor rodada,
maior sequência e quando jogou pela última vez. O `LEFT JOIN` mantém na lista
quem se cadastrou e ainda não terminou nenhuma rodada.

## Mudar o esquema

O `db/init.sql` roda **uma vez só**, quando o volume do Postgres está vazio.
Editar o arquivo com o banco já criado não muda nada.

Em desenvolvimento, recrie:

```bash
./parar.sh --apagar-dados && ./iniciar.sh
```

Para um ambiente com dados que importam, isso não serve: seria preciso uma
ferramenta de migração (Alembic, por exemplo). O projeto ainda não tem uma,
porque ainda não precisou.

## Acessar

```bash
docker compose exec db psql -U bbam -d bbam
```

| Comando | O que mostra |
| --- | --- |
| `\dt` | Tabelas |
| `\dv` | Visões |
| `\dT+` | Tipos enumerados e seus valores |
| `\d rodadas` | Colunas, índices e restrições de `rodadas` |

## Backup

```bash
# salvar
docker compose exec -T db pg_dump -U bbam bbam > backup.sql

# restaurar
docker compose exec -T db psql -U bbam -d bbam < backup.sql
```
