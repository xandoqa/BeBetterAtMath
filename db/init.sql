-- Be Better at Math — esquema do placar compartilhado
-- Versão 2.1.0
--
-- Este arquivo roda automaticamente na PRIMEIRA vez que o contêiner do
-- Postgres sobe com o volume vazio. Se você alterar o esquema depois,
-- precisa recriar o volume:
--     ./parar.sh --apagar-dados && ./iniciar.sh

BEGIN;

-- --------------------------------------------------------------------
-- Tipos
-- --------------------------------------------------------------------
-- Enums em vez de texto solto: o banco recusa um modo ou nível inválido
-- em vez de guardar lixo que só apareceria na hora de montar o ranking.

CREATE TYPE modo_jogo AS ENUM ('tabuada', 'random');
CREATE TYPE nivel_jogo AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE operacao_jogo AS ENUM ('sum', 'sub', 'mul', 'div', 'mix');

-- --------------------------------------------------------------------
-- Jogadores
-- --------------------------------------------------------------------
-- Não há senha nem e-mail: o jogador escolhe um apelido e pronto. O app
-- é um treino de tabuada; não vale guardar dado pessoal que não precisa.

CREATE TABLE jogadores (
    id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    apelido   TEXT        NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT apelido_tamanho CHECK (char_length(apelido) BETWEEN 2 AND 24),
    CONSTRAINT apelido_sem_espaco_nas_pontas CHECK (apelido = btrim(apelido))
);

-- "Alexandre" e "alexandre" são a mesma pessoa no placar.
CREATE UNIQUE INDEX jogadores_apelido_unico ON jogadores (lower(apelido));

-- --------------------------------------------------------------------
-- Rodadas
-- --------------------------------------------------------------------
-- Cada rodada terminada vira uma linha. Guardar o histórico inteiro, em
-- vez de só o recorde, permite montar qualquer ranking depois sem perder
-- informação — e é barato: são dez contas por linha.

CREATE TABLE rodadas (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    jogador_id BIGINT        NOT NULL REFERENCES jogadores (id) ON DELETE CASCADE,
    modo       modo_jogo     NOT NULL,
    nivel      nivel_jogo    NOT NULL,
    operacao   operacao_jogo NOT NULL,
    pontos     INTEGER       NOT NULL,
    acertos    SMALLINT      NOT NULL,
    total      SMALLINT      NOT NULL,
    maior_seq  SMALLINT      NOT NULL,
    duracao_ms INTEGER       NOT NULL,
    criado_em  TIMESTAMPTZ   NOT NULL DEFAULT now(),

    -- O banco é a última linha de defesa: mesmo que a API tenha um erro,
    -- uma rodada impossível não entra.
    CONSTRAINT pontos_validos   CHECK (pontos BETWEEN 0 AND 10000),
    CONSTRAINT total_valido     CHECK (total BETWEEN 1 AND 100),
    CONSTRAINT acertos_validos  CHECK (acertos BETWEEN 0 AND total),
    CONSTRAINT sequencia_valida CHECK (maior_seq BETWEEN 0 AND total),
    CONSTRAINT duracao_valida   CHECK (duracao_ms BETWEEN 0 AND 86400000)
);

-- O ranking sempre filtra por categoria e ordena por pontos.
CREATE INDEX rodadas_ranking
    ON rodadas (modo, operacao, nivel, pontos DESC, duracao_ms ASC);

-- O histórico de um jogador, do mais recente para o mais antigo.
CREATE INDEX rodadas_por_jogador ON rodadas (jogador_id, criado_em DESC);

-- --------------------------------------------------------------------
-- Visões
-- --------------------------------------------------------------------

-- Melhor rodada de cada jogador em cada categoria. O DISTINCT ON é
-- específico do Postgres e evita a subconsulta com MAX e join de volta.
-- Empate em pontos é desempatado pelo menor tempo.
CREATE VIEW melhores_por_categoria AS
SELECT DISTINCT ON (r.jogador_id, r.modo, r.operacao, r.nivel)
       r.jogador_id,
       j.apelido,
       r.modo,
       r.operacao,
       r.nivel,
       r.pontos,
       r.acertos,
       r.total,
       r.maior_seq,
       r.duracao_ms,
       r.criado_em
  FROM rodadas r
  JOIN jogadores j ON j.id = r.jogador_id
 ORDER BY r.jogador_id, r.modo, r.operacao, r.nivel,
          r.pontos DESC, r.duracao_ms ASC, r.criado_em ASC;

-- O placar como aparece na tela: posição por categoria.
CREATE VIEW ranking AS
SELECT modo,
       operacao,
       nivel,
       RANK() OVER (
           PARTITION BY modo, operacao, nivel
           ORDER BY pontos DESC, duracao_ms ASC
       ) AS posicao,
       apelido,
       pontos,
       acertos,
       total,
       maior_seq,
       duracao_ms,
       criado_em
  FROM melhores_por_categoria;

-- Resumo de cada jogador, somando tudo o que já jogou.
CREATE VIEW resumo_jogadores AS
SELECT j.id,
       j.apelido,
       count(r.id)                      AS rodadas,
       coalesce(sum(r.pontos), 0)       AS pontos_totais,
       coalesce(max(r.pontos), 0)       AS melhor_rodada,
       coalesce(sum(r.acertos), 0)      AS acertos,
       coalesce(sum(r.total), 0)        AS contas,
       coalesce(max(r.maior_seq), 0)    AS maior_sequencia,
       max(r.criado_em)                 AS jogou_pela_ultima_vez
  FROM jogadores j
  LEFT JOIN rodadas r ON r.jogador_id = j.id
 GROUP BY j.id, j.apelido;

COMMIT;
