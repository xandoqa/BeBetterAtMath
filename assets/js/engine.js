/**
 * Regras do jogo — sem nenhuma dependência do DOM.
 *
 * Isolar a lógica aqui permite testá-la fora do navegador e manter
 * a versão de terminal (tools/bbam.py) com o mesmo comportamento.
 */
/** Versão do projeto. Mantenha em sincronia com package.json,
 *  tools/bbam.py e CHANGELOG.md ao publicar. */
export const VERSION = "2.1.0";
export const ROUND_LENGTH = 10;
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
const SYMBOLS = {
    sum: "+",
    sub: "−",
    mul: "×",
    div: "÷",
};
const MIX_POOL = ["sum", "sub", "mul", "div"];
/** Inteiro entre min e max, ambos inclusive. */
export function randInt(min, max, rng = Math.random) {
    const lo = Math.ceil(Math.min(min, max));
    const hi = Math.floor(Math.max(min, max));
    return lo + Math.floor(rng() * (hi - lo + 1));
}
function build(a, b, op, answer) {
    return { a, b, symbol: SYMBOLS[op], answer, text: `${a} ${SYMBOLS[op]} ${b}` };
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
 * Base de 10, mais 2 por acerto seguido, com teto de 20 para que a
 * pontuação não dispare.
 */
export function pointsFor(streak) {
    return 10 + Math.min(Math.max(streak - 1, 0), 5) * 2;
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
//# sourceMappingURL=engine.js.map