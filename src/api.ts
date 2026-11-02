/**
 * Cliente do placar compartilhado.
 *
 * Tudo aqui é **opcional**. Sem a API no ar — no GitHub Pages, por
 * exemplo, ou com o Docker desligado — todas as funções falham em
 * silêncio e o jogo segue com os recordes locais. Nenhuma chamada deste
 * arquivo pode impedir uma tela de aparecer.
 */

import type { Level, Mode, Operation, RoundResult } from "./engine.js";

/** Endereço da API. Mesma origem por padrão; o nginx repassa /api. */
const BASE =
  document.querySelector<HTMLMetaElement>('meta[name="bbam-api"]')?.content?.trim() || "/api";

/** Nenhuma chamada pode travar a tela esperando resposta. */
const TIMEOUT_MS = 3000;

export interface BoardRow {
  readonly posicao: number;
  readonly apelido: string;
  readonly pontos: number;
  readonly acertos: number;
  readonly total: number;
  readonly maior_seq: number;
  readonly duracao_ms: number;
}

export interface SavedRound {
  readonly id: number;
  readonly posicao: number | null;
  readonly melhor_pessoal: number;
}

async function request<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(`${BASE}${path}`, {
      ...init,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    // API fora do ar, sem rede, CORS barrado ou tempo esgotado:
    // nenhum desses casos é erro do ponto de vista do jogador.
    return null;
  }
}

let availability: Promise<boolean> | null = null;

/** Diz se o placar está disponível. O resultado é consultado uma vez por sessão. */
export function isAvailable(): Promise<boolean> {
  availability ??= request<{ status: string; banco: boolean }>("/saude").then(
    (saude) => saude?.status === "ok" && saude.banco === true,
  );
  return availability;
}

/** Envia uma rodada terminada. Devolve null se não deu para enviar. */
export function submitRound(result: RoundResult, apelido: string): Promise<SavedRound | null> {
  return request<SavedRound>("/rodadas", {
    method: "POST",
    body: JSON.stringify({
      apelido,
      modo: result.mode,
      nivel: result.level,
      operacao: result.operation,
      pontos: result.score,
      acertos: result.hits,
      total: result.total,
      maior_seq: result.bestStreak,
      duracao_ms: result.elapsedMs,
    }),
  });
}

/** As melhores pontuações de uma categoria. Lista vazia se não deu para buscar. */
export async function fetchRanking(
  mode: Mode,
  operation: Operation,
  level: Level,
  limit = 10,
): Promise<BoardRow[]> {
  const query = new URLSearchParams({
    modo: mode,
    operacao: operation,
    nivel: level,
    limite: String(limit),
  });
  return (await request<BoardRow[]>(`/ranking?${query}`)) ?? [];
}
