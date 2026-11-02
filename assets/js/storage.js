/**
 * Recordes e preferências, guardados no próprio aparelho.
 *
 * Todo acesso passa por try/catch: em janela anônima ou com os dados do
 * site bloqueados, o localStorage lança em vez de retornar vazio, e o
 * jogo precisa continuar funcionando sem ele.
 */
const PREFIX = "bbam";
function read(key) {
    try {
        return window.localStorage.getItem(key);
    }
    catch {
        return null;
    }
}
function write(key, value) {
    try {
        window.localStorage.setItem(key, value);
    }
    catch {
        /* sem armazenamento: o jogo segue, só não guarda nada */
    }
}
function recordKey(mode, operation, level) {
    return `${PREFIX}:best:${mode}:${mode === "tabuada" ? "mul" : operation}:${level}`;
}
export function getBest(mode, operation, level) {
    const raw = read(recordKey(mode, operation, level));
    if (!raw)
        return null;
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && typeof parsed.score === "number") {
            return parsed;
        }
    }
    catch {
        /* registro corrompido: trata como inexistente */
    }
    return null;
}
/** Salva o resultado se ele superar o recorde. Retorna true se for recorde novo. */
export function saveIfBest(result) {
    // zero ponto nunca é recorde, mesmo na primeira rodada
    if (result.score <= 0)
        return false;
    const previous = getBest(result.mode, result.operation, result.level);
    if (previous && previous.score >= result.score)
        return false;
    const entry = {
        score: result.score,
        hits: result.hits,
        total: result.total,
        elapsedMs: result.elapsedMs,
        date: new Date().toISOString(),
    };
    write(recordKey(result.mode, result.operation, result.level), JSON.stringify(entry));
    return true;
}
export function clearRecords() {
    try {
        const keys = [];
        for (let i = 0; i < window.localStorage.length; i += 1) {
            const key = window.localStorage.key(i);
            if (key?.startsWith(`${PREFIX}:best:`))
                keys.push(key);
        }
        keys.forEach((key) => window.localStorage.removeItem(key));
    }
    catch {
        /* nada a limpar */
    }
}
/** Apelido usado no placar compartilhado, se o jogador já escolheu um. */
export function getNickname() {
    const value = read(`${PREFIX}:apelido`)?.trim();
    return value ? value : null;
}
export function setNickname(apelido) {
    write(`${PREFIX}:apelido`, apelido.trim());
}
export function getTheme() {
    const value = read(`${PREFIX}:theme`);
    return value === "light" || value === "dark" ? value : "auto";
}
export function setTheme(choice) {
    write(`${PREFIX}:theme`, choice);
}
//# sourceMappingURL=storage.js.map