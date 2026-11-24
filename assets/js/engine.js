/**
 * Regras de uma rodada — sem nenhuma dependência do DOM.
 *
 * Isolar as regras aqui permite testá-las fora do navegador e manter a
 * versão de terminal (tools/bbam.py) com o mesmo comportamento.
 *
 * Progressão (XP, níveis, ofensiva, conquistas) NÃO mora aqui: é outro
 * assunto, e fica em progress.ts.
 */
/** Versão do projeto. Ao publicar, atualize os cinco lugares listados
 *  em docs/desenvolvimento.md. */
export const VERSION = "3.1.0";
/** Contas por rodada. */
export const ROUND_LENGTH = 10;
/** Vidas por rodada. Erra, perde uma; sem vidas, a rodada termina. */
export const MAX_HEARTS = 5;
export const LEVELS = {
    easy: { label: "Fácil", min: 1, max: 10 },
    medium: { label: "Médio", min: 10, max: 50 },
    hard: { label: "Difícil", min: 50, max: 100 },
};
export const OPERATION_LABELS = {
    sum: "Soma",
    sub: "Subtração",
    mul: "Multiplicação",
    div: "Divisão",
    mix: "Misto",
};
export const OPERATION_SYMBOLS = {
    sum: "+",
    sub: "−",
    mul: "×",
    div: "÷",
};
const MIX_POOL = ["sum", "sub", "mul", "div"];
const BY_SYMBOL = new Map(Object.entries(OPERATION_SYMBOLS).map(([op, symbol]) => [
    symbol,
    op,
]));
/** Qual operação um símbolo representa. Usado para contar acertos por
 *  operação quando a rodada é mista. */
export function operationOf(symbol) {
    return BY_SYMBOL.get(symbol);
}
/** Inteiro entre min e max, ambos inclusive. */
export function randInt(min, max, rng = Math.random) {
    const lo = Math.ceil(Math.min(min, max));
    const hi = Math.floor(Math.max(min, max));
    return lo + Math.floor(rng() * (hi - lo + 1));
}
function build(a, b, op, answer) {
    const symbol = OPERATION_SYMBOLS[op];
    return { a, b, symbol, answer, text: `${a} ${symbol} ${b}` };
}
/**
 * Monta uma conta respeitando a faixa do nível.
 *
 * A divisão é construída ao contrário (a = b × resultado) para que o
 * resultado seja sempre inteiro, e a subtração garante a ≥ b para não
 * produzir negativos.
 */
export function makeQuestion(mode, level, operation = "mul", rng = Math.random) {
    const { min, max } = LEVELS[level];
    if (mode === "tabuada") {
        const a = randInt(min, max, rng);
        const b = randInt(1, 10, rng);
        return build(a, b, "mul", a * b);
    }
    const op = operation === "mix" ? MIX_POOL[randInt(0, MIX_POOL.length - 1, rng)] : operation;
    switch (op) {
        case "sum": {
            const a = randInt(min, max, rng);
            const b = randInt(min, max, rng);
            return build(a, b, op, a + b);
        }
        case "sub": {
            const a = randInt(min, max, rng);
            const b = randInt(min, a, rng);
            return build(a, b, op, a - b);
        }
        case "mul": {
            const a = randInt(min, max, rng);
            const b = randInt(2, 12, rng);
            return build(a, b, op, a * b);
        }
        case "div": {
            const b = randInt(2, 12, rng);
            const quotient = randInt(min, max, rng);
            return build(b * quotient, b, op, quotient);
        }
    }
}
/**
 * Pontos de um acerto. `streak` é a sequência já contando este acerto.
 * Base de 10, mais 2 por acerto seguido, com teto de 20 para que uma
 * sequência longa de sorte não torne o recorde inalcançável depois.
 */
export function pointsFor(streak) {
    return 10 + Math.min(Math.max(streak - 1, 0), 5) * 2;
}
/**
 * Pontuação máxima possível numa rodada de `total` contas — todas certas,
 * em sequência. Serve para a API recusar pontuação impossível: sem isso,
 * qualquer um pode enviar um número inventado e dominar o placar.
 */
export function maxScoreFor(total = ROUND_LENGTH) {
    let sum = 0;
    for (let streak = 1; streak <= total; streak += 1)
        sum += pointsFor(streak);
    return sum;
}
/** Percentual de acertos, arredondado. */
export function accuracy(hits, total) {
    return total === 0 ? 0 : Math.round((hits / total) * 100);
}
/** Duração em formato curto: 48s, 1min 12s. */
export function formatDuration(ms) {
    const seconds = Math.max(0, Math.round(ms / 1000));
    if (seconds < 60)
        return `${seconds}s`;
    return `${Math.floor(seconds / 60)}min ${String(seconds % 60).padStart(2, "0")}s`;
}
/** Rótulo de uma rodada, ex. "Números aleatórios · Soma · Médio". */
export function describeRound(mode, level, operation) {
    const parts = mode === "tabuada" ? ["Tabuada"] : ["Números aleatórios", OPERATION_LABELS[operation]];
    return [...parts, LEVELS[level].label].join(" · ");
}
/** Rótulo curto, para espaços apertados: "Tabuada · Fácil". */
export function describeShort(mode, level, operation) {
    const head = mode === "tabuada" ? "Tabuada" : OPERATION_LABELS[operation];
    return `${head} · ${LEVELS[level].label}`;
}
//# sourceMappingURL=engine.js.map