/**
 * Persistência local: recordes, progresso e preferências.
 *
 * Todo acesso passa por try/catch. Em janela anônima, ou com os dados do
 * site bloqueados, o localStorage **lança** em vez de devolver vazio — e
 * o jogo precisa continuar funcionando sem ele, só sem guardar nada.
 *
 * As chaves da v2 (`bbam:best:*`) continuam sendo lidas e escritas: quem
 * já tinha recordes não os perde ao atualizar.
 */
import { emptyProgress } from "./progress.js";
const PREFIX = "bbam";
const PROGRESS_KEY = `${PREFIX}:progress:v3`;
/* --- Acesso cru ----------------------------------------------------- */
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
        /* sem armazenamento: o jogo segue, só não guarda */
    }
}
function remove(key) {
    try {
        window.localStorage.removeItem(key);
    }
    catch {
        /* idem */
    }
}
function keys() {
    try {
        const found = [];
        for (let i = 0; i < window.localStorage.length; i += 1) {
            const key = window.localStorage.key(i);
            if (key)
                found.push(key);
        }
        return found;
    }
    catch {
        return [];
    }
}
/** Diz se o navegador deixa guardar algo. Usado para avisar o jogador. */
export function isStorageAvailable() {
    try {
        const probe = `${PREFIX}:probe`;
        window.localStorage.setItem(probe, "1");
        window.localStorage.removeItem(probe);
        return true;
    }
    catch {
        return false;
    }
}
/* --- Recordes por categoria (compatível com a v2) -------------------- */
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
/** Salva o resultado se superar o recorde. Retorna true se for recorde novo. */
export function saveIfBest(result) {
    // Zero ponto nunca é recorde, mesmo na primeira rodada.
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
    keys()
        .filter((key) => key.startsWith(`${PREFIX}:best:`))
        .forEach(remove);
}
/* --- Progresso ------------------------------------------------------- */
/**
 * Lê o progresso, completando campos que faltarem.
 *
 * Um estado salvo por uma versão anterior pode não ter todas as chaves de
 * hoje; mesclar com o estado vazio evita `undefined` solto no meio de uma
 * conta de XP, que apareceria como NaN na tela.
 */
export function loadProgress() {
    const base = emptyProgress();
    const raw = read(PROGRESS_KEY);
    if (!raw)
        return base;
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object")
            return base;
        const saved = parsed;
        return {
            ...base,
            ...saved,
            correctByOperation: { ...base.correctByOperation, ...saved.correctByOperation },
            lessons: { ...base.lessons, ...saved.lessons },
            achievements: { ...base.achievements, ...saved.achievements },
            // Números que vieram corrompidos voltam ao padrão.
            xp: Number.isFinite(saved.xp) ? Number(saved.xp) : base.xp,
            dailyGoal: Number.isFinite(saved.dailyGoal) ? Number(saved.dailyGoal) : base.dailyGoal,
        };
    }
    catch {
        return base;
    }
}
export function saveProgress(state) {
    write(PROGRESS_KEY, JSON.stringify(state));
}
export function clearProgress() {
    remove(PROGRESS_KEY);
}
/* --- Preferências ---------------------------------------------------- */
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
export function isSoundOn() {
    return read(`${PREFIX}:sound`) !== "off";
}
export function setSoundOn(on) {
    write(`${PREFIX}:sound`, on ? "on" : "off");
}
export function isKeypadOn() {
    return read(`${PREFIX}:keypad`) !== "off";
}
export function setKeypadOn(on) {
    write(`${PREFIX}:keypad`, on ? "on" : "off");
}
/** Apaga tudo o que o app guardou. Usado no "começar do zero". */
export function clearEverything() {
    keys()
        .filter((key) => key.startsWith(`${PREFIX}:`))
        .forEach(remove);
}
//# sourceMappingURL=storage.js.map