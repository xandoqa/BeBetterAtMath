"""Be Better at Math — API do placar compartilhado.

Guarda as rodadas terminadas no PostgreSQL e devolve o ranking.

A API é **opcional**: o jogo funciona sem ela, usando só os recordes
locais do navegador. Por isso nada aqui pode ser requisito para o site
abrir.

Sobe com:
    uvicorn app:app --host 0.0.0.0 --port 8000
ou, pelo Docker, com o ./iniciar.sh na raiz do projeto.
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import Annotated, AsyncIterator, Literal

import psycopg
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool
from pydantic import BaseModel, Field, field_validator

VERSION = "2.1.0"

Modo = Literal["tabuada", "random"]
Nivel = Literal["easy", "medium", "hard"]
Operacao = Literal["sum", "sub", "mul", "div", "mix"]


def database_url() -> str:
    """Monta a URL do banco a partir das variáveis de ambiente."""
    if url := os.getenv("DATABASE_URL"):
        return url
    user = os.getenv("POSTGRES_USER", "bbam")
    password = os.getenv("POSTGRES_PASSWORD", "bbam")
    host = os.getenv("POSTGRES_HOST", "db")
    port = os.getenv("POSTGRES_PORT", "5432")
    name = os.getenv("POSTGRES_DB", "bbam")
    return f"postgresql://{user}:{password}@{host}:{port}/{name}"


pool: AsyncConnectionPool | None = None


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Abre o pool de conexões ao subir e fecha ao encerrar."""
    global pool
    pool = AsyncConnectionPool(
        database_url(),
        min_size=1,
        max_size=10,
        kwargs={"row_factory": dict_row},
        open=False,
    )
    await pool.open(wait=True, timeout=30)
    try:
        yield
    finally:
        await pool.close()


app = FastAPI(
    title="Be Better at Math — placar",
    version=VERSION,
    summary="Placar compartilhado do treino de cálculo mental.",
    lifespan=lifespan,
)

# O site pode ser servido de outra origem (nginx local, GitHub Pages).
# Só os métodos que a API de fato usa ficam liberados.
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


async def connection() -> AsyncIterator[psycopg.AsyncConnection]:
    if pool is None:  # pragma: no cover — só acontece fora do lifespan
        raise HTTPException(status_code=503, detail="Banco indisponível.")
    async with pool.connection() as conn:
        yield conn


Conn = Annotated[psycopg.AsyncConnection, Depends(connection)]


# --- Modelos ---------------------------------------------------------


class RodadaEntrada(BaseModel):
    """O resultado de uma rodada, como o jogo envia."""

    apelido: str = Field(min_length=2, max_length=24)
    modo: Modo
    nivel: Nivel
    operacao: Operacao
    pontos: int = Field(ge=0, le=10_000)
    acertos: int = Field(ge=0, le=100)
    total: int = Field(ge=1, le=100)
    maior_seq: int = Field(ge=0, le=100)
    duracao_ms: int = Field(ge=0, le=86_400_000)

    @field_validator("apelido")
    @classmethod
    def limpar_apelido(cls, value: str) -> str:
        limpo = " ".join(value.split())
        if len(limpo) < 2:
            raise ValueError("O apelido precisa de ao menos dois caracteres.")
        return limpo

    @field_validator("acertos")
    @classmethod
    def acertos_cabem_no_total(cls, value: int, info) -> int:
        total = info.data.get("total")
        if total is not None and value > total:
            raise ValueError("Não dá para acertar mais contas do que a rodada tem.")
        return value


class RodadaSalva(BaseModel):
    id: int
    posicao: int | None = Field(description="Posição na categoria, se entrou no ranking.")
    melhor_pessoal: int


class LinhaRanking(BaseModel):
    posicao: int
    apelido: str
    pontos: int
    acertos: int
    total: int
    maior_seq: int
    duracao_ms: int


class Saude(BaseModel):
    status: Literal["ok", "degradado"]
    versao: str
    banco: bool


# --- Rotas -----------------------------------------------------------


@app.get("/api/saude", response_model=Saude, tags=["serviço"])
async def saude(conn: Conn) -> Saude:
    """Checagem usada pelo Docker e pelo front-end antes de mostrar o placar."""
    try:
        await conn.execute("SELECT 1")
        return Saude(status="ok", versao=VERSION, banco=True)
    except psycopg.Error:
        return Saude(status="degradado", versao=VERSION, banco=False)


@app.post("/api/rodadas", response_model=RodadaSalva, status_code=201, tags=["placar"])
async def registrar_rodada(rodada: RodadaEntrada, conn: Conn) -> RodadaSalva:
    """Guarda uma rodada terminada e devolve a posição alcançada."""
    if rodada.acertos > rodada.total or rodada.maior_seq > rodada.total:
        raise HTTPException(status_code=422, detail="Rodada inconsistente.")

    async with conn.cursor() as cur:
        # Cria o jogador na primeira vez; nas seguintes só recupera o id.
        await cur.execute(
            """
            INSERT INTO jogadores (apelido) VALUES (%s)
            ON CONFLICT (lower(apelido)) DO UPDATE SET apelido = jogadores.apelido
            RETURNING id
            """,
            (rodada.apelido,),
        )
        row = await cur.fetchone()
        assert row is not None
        jogador_id = row["id"]

        await cur.execute(
            """
            INSERT INTO rodadas
                (jogador_id, modo, nivel, operacao, pontos,
                 acertos, total, maior_seq, duracao_ms)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                jogador_id,
                rodada.modo,
                rodada.nivel,
                rodada.operacao,
                rodada.pontos,
                rodada.acertos,
                rodada.total,
                rodada.maior_seq,
                rodada.duracao_ms,
            ),
        )
        inserida = await cur.fetchone()
        assert inserida is not None

        await cur.execute(
            """
            SELECT posicao, pontos
              FROM ranking
             WHERE modo = %s AND operacao = %s AND nivel = %s
               AND lower(apelido) = lower(%s)
            """,
            (rodada.modo, rodada.operacao, rodada.nivel, rodada.apelido),
        )
        colocacao = await cur.fetchone()

    return RodadaSalva(
        id=inserida["id"],
        posicao=colocacao["posicao"] if colocacao else None,
        melhor_pessoal=colocacao["pontos"] if colocacao else rodada.pontos,
    )


@app.get("/api/ranking", response_model=list[LinhaRanking], tags=["placar"])
async def ler_ranking(
    conn: Conn,
    modo: Modo = "tabuada",
    operacao: Operacao = "mul",
    nivel: Nivel = "easy",
    limite: Annotated[int, Query(ge=1, le=100)] = 10,
) -> list[LinhaRanking]:
    """As melhores pontuações de uma categoria."""
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT posicao, apelido, pontos, acertos, total, maior_seq, duracao_ms
              FROM ranking
             WHERE modo = %s AND operacao = %s AND nivel = %s
             ORDER BY posicao
             LIMIT %s
            """,
            (modo, operacao, nivel, limite),
        )
        linhas = await cur.fetchall()

    return [LinhaRanking(**linha) for linha in linhas]


@app.get("/api/jogadores/{apelido}", tags=["placar"])
async def resumo_jogador(apelido: str, conn: Conn) -> dict[str, object]:
    """Tudo o que um jogador já fez, somado."""
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT * FROM resumo_jogadores WHERE lower(apelido) = lower(%s)",
            (apelido,),
        )
        resumo = await cur.fetchone()

    if resumo is None:
        raise HTTPException(status_code=404, detail="Jogador não encontrado.")
    return dict(resumo)
