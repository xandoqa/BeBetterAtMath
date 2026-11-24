/**
 * Progressão: XP, níveis, ofensiva de dias, estrelas e conquistas.
 *
 * Tudo aqui é função pura sobre um objeto de estado. Nada de DOM, nada
 * de localStorage — quem guarda é storage.ts, quem mostra é app.ts.
 * Essa separação é o que permite testar a progressão inteira em Node.
 *
 * Nenhum número é decorativo: cada conquista e cada nível sai de um
 * contador que foi de fato incrementado por uma rodada jogada.
 */
import { ROUND_LENGTH, accuracy } from "./engine.js";
import { LESSONS, TOTAL_LESSONS, UNITS, indexOf } from "./curriculum.js";
export const DAILY_GOALS = [20, 50, 100];
export const DEFAULT_DAILY_GOAL = 50;
export function emptyProgress() {
    return {
        xp: 0,
        rounds: 0,
        questions: 0,
        correct: 0,
        perfectRounds: 0,
        bestStreakEver: 0,
        correctByOperation: {},
        lessons: {},
        achievements: {},
        streakDays: 0,
        longestStreak: 0,
        lastPlayedDate: null,
        dailyGoal: DEFAULT_DAILY_GOAL,
        todayDate: null,
        todayXp: 0,
    };
}
/* --- Datas --------------------------------------------------------- */
/**
 * Data local em AAAA-MM-DD.
 *
 * Usa a data local de propósito: a ofensiva precisa virar à meia-noite de
 * quem joga, não à meia-noite de Londres. `toISOString()` daria UTC e
 * quebraria a virada do dia para quem está no Brasil.
 */
export function today(now = new Date()) {
    const ano = now.getFullYear();
    const mes = String(now.getMonth() + 1).padStart(2, "0");
    const dia = String(now.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}
/** O dia anterior a uma data AAAA-MM-DD. */
export function dayBefore(date) {
    const [ano, mes, dia] = date.split("-").map(Number);
    const d = new Date(ano, mes - 1, dia);
    d.setDate(d.getDate() - 1);
    return today(d);
}
const MAX_LEVEL = 99;
/** XP que cada nível exige para avançar: cresce 50 por nível. */
function costOfLevel(level) {
    return 100 + (level - 1) * 50;
}
/** XP total necessário para alcançar um nível. */
export function xpToReach(level) {
    const n = Math.max(1, Math.min(level, MAX_LEVEL));
    // Fechado: (n−1) · (25n + 50). Confirmado pelos testes contra a soma.
    return (n - 1) * (25 * n + 50);
}
export function levelFor(xp) {
    const total = Math.max(0, xp);
    let level = 1;
    while (level < MAX_LEVEL && total >= xpToReach(level + 1))
        level += 1;
    const base = xpToReach(level);
    const xpForLevel = level >= MAX_LEVEL ? 0 : costOfLevel(level);
    const xpInLevel = total - base;
    return {
        level,
        xpInLevel,
        xpForLevel,
        ratio: xpForLevel === 0 ? 1 : Math.min(1, xpInLevel / xpForLevel),
    };
}
/* --- XP e estrelas da rodada ---------------------------------------- */
/** 2 XP por acerto, +5 por terminar a rodada, +5 se não errar nenhuma. */
export function xpForRound(result) {
    let xp = result.hits * 2;
    if (result.completed)
        xp += 5;
    if (result.hits === result.total)
        xp += 5;
    return xp;
}
export const MAX_XP_PER_ROUND = ROUND_LENGTH * 2 + 10;
/** 3 estrelas sem erro, 2 com até um erro, 1 por concluir. */
export function starsFor(result) {
    if (!result.completed)
        return 0;
    const errors = result.total - result.hits;
    if (errors === 0)
        return 3;
    if (errors <= 1)
        return 2;
    return 1;
}
/* --- Trilha --------------------------------------------------------- */
export function lessonRecord(state, lessonId) {
    return state.lessons[lessonId] ?? null;
}
export function isDone(state, lessonId) {
    return (state.lessons[lessonId]?.stars ?? 0) > 0;
}
/**
 * Uma lição está destravada se é a primeira da trilha ou se a anterior
 * já foi concluída. Nada de destravar por XP: o caminho é sequencial.
 */
export function isUnlocked(state, lessonId) {
    const position = indexOf(lessonId);
    if (position <= 0)
        return position === 0;
    return isDone(state, LESSONS[position - 1].id);
}
/** A próxima lição a fazer, ou null quando a trilha acabou. */
export function nextLesson(state) {
    return LESSONS.find((lesson) => !isDone(state, lesson.id))?.id ?? null;
}
export function lessonsDone(state) {
    return LESSONS.filter((lesson) => isDone(state, lesson.id)).length;
}
export function unitIsDone(state, unit) {
    return unit.lessons.every((lesson) => isDone(state, lesson.id));
}
export function unitStars(state, unit) {
    return unit.lessons.reduce((sum, lesson) => sum + (state.lessons[lesson.id]?.stars ?? 0), 0);
}
function counter(id, title, description, icon, need, read) {
    return {
        id,
        title,
        description,
        icon,
        test: (state) => read(state) >= need,
        progress: (state) => ({ have: Math.min(read(state), need), need }),
    };
}
export const ACHIEVEMENTS = [
    counter("primeira", "Primeira rodada", "Termine uma rodada", "🌱", 1, (s) => s.rounds),
    counter("dez-rodadas", "Pegando o jeito", "Termine 10 rodadas", "🎯", 10, (s) => s.rounds),
    counter("cem-rodadas", "Veterano", "Termine 100 rodadas", "🏅", 100, (s) => s.rounds),
    counter("perfeita", "Sem errar uma", "Acerte uma rodada inteira", "✨", 1, (s) => s.perfectRounds),
    counter("dez-perfeitas", "Impecável", "Acerte 10 rodadas inteiras", "💎", 10, (s) => s.perfectRounds),
    counter("sequencia-10", "Dez na agulha", "Faça 10 acertos seguidos", "⚡", 10, (s) => s.bestStreakEver),
    counter("ofensiva-3", "Três dias", "Jogue 3 dias seguidos", "🔥", 3, (s) => s.longestStreak),
    counter("ofensiva-7", "Uma semana", "Jogue 7 dias seguidos", "🔥", 7, (s) => s.longestStreak),
    counter("ofensiva-30", "Um mês inteiro", "Jogue 30 dias seguidos", "🔥", 30, (s) => s.longestStreak),
    counter("xp-500", "500 de XP", "Acumule 500 de XP", "⭐", 500, (s) => s.xp),
    counter("xp-2000", "2.000 de XP", "Acumule 2.000 de XP", "🌟", 2000, (s) => s.xp),
    counter("mil-contas", "Mil contas", "Responda 1.000 contas", "🧮", 1000, (s) => s.questions),
    counter("nivel-5", "Nível 5", "Chegue ao nível 5", "🎖️", 5, (s) => levelFor(s.xp).level),
    counter("nivel-10", "Nível 10", "Chegue ao nível 10", "👑", 10, (s) => levelFor(s.xp).level),
    counter("tabuada-200", "Tabuada na ponta da língua", "Acerte 200 multiplicações", "✖️", 200, (s) => s.correctByOperation.mul ?? 0),
    counter("divisao-100", "Dividindo bem", "Acerte 100 divisões", "➗", 100, (s) => s.correctByOperation.div ?? 0),
    {
        id: "unidade-completa",
        title: "Unidade fechada",
        description: "Conclua todas as lições de uma unidade",
        icon: "📦",
        test: (state) => UNITS.some((unit) => unitIsDone(state, unit)),
    },
    {
        id: "unidade-tres-estrelas",
        title: "Unidade dourada",
        description: "Faça 3 estrelas em todas as lições de uma unidade",
        icon: "🥇",
        test: (state) => UNITS.some((unit) => unit.lessons.every((l) => (state.lessons[l.id]?.stars ?? 0) === 3)),
    },
    counter("trilha-completa", "Trilha inteira", "Conclua todas as lições da trilha", "🏆", TOTAL_LESSONS, lessonsDone),
];
const ACHIEVEMENT_BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));
export function findAchievement(id) {
    return ACHIEVEMENT_BY_ID.get(id);
}
export function isUnlockedAchievement(state, id) {
    return id in state.achievements;
}
export function unlockedCount(state) {
    return ACHIEVEMENTS.filter((a) => isUnlockedAchievement(state, a.id)).length;
}
/**
 * Soma uma rodada ao progresso. Devolve um estado novo — nunca altera o
 * recebido — mais o resumo do que mudou, que é o que a tela de resultado
 * precisa para celebrar a coisa certa.
 */
export function applyRound(previous, result, now = new Date()) {
    const state = {
        ...previous,
        correctByOperation: { ...previous.correctByOperation },
        lessons: { ...previous.lessons },
        achievements: { ...previous.achievements },
    };
    const hoje = today(now);
    const levelBefore = levelFor(state.xp).level;
    const xpGained = xpForRound(result);
    const stars = starsFor(result);
    state.xp += xpGained;
    state.rounds += 1;
    state.questions += result.hits + result.misses.length;
    state.correct += result.hits;
    state.bestStreakEver = Math.max(state.bestStreakEver, result.bestStreak);
    if (result.completed && result.hits === result.total)
        state.perfectRounds += 1;
    for (const [op, count] of Object.entries(result.correctByOperation)) {
        const key = op;
        state.correctByOperation[key] = (state.correctByOperation[key] ?? 0) + (count ?? 0);
    }
    // Meta diária: zera ao virar o dia.
    if (state.todayDate !== hoje) {
        state.todayDate = hoje;
        state.todayXp = 0;
    }
    const goalBefore = state.todayXp >= state.dailyGoal;
    state.todayXp += xpGained;
    const dailyGoalReached = !goalBefore && state.todayXp >= state.dailyGoal;
    // Ofensiva: um dia seguido do outro mantém; um buraco reinicia.
    let streakExtended = false;
    if (state.lastPlayedDate !== hoje) {
        state.streakDays = state.lastPlayedDate === dayBefore(hoje) ? state.streakDays + 1 : 1;
        state.lastPlayedDate = hoje;
        state.longestStreak = Math.max(state.longestStreak, state.streakDays);
        streakExtended = true;
    }
    // Lição da trilha: guarda o melhor desempenho, nunca piora o registro.
    let lessonImproved = false;
    if (result.lessonId && stars > 0) {
        const current = state.lessons[result.lessonId];
        const melhorEstrelas = Math.max(current?.stars ?? 0, stars);
        const melhorPontos = Math.max(current?.bestScore ?? 0, result.score);
        lessonImproved = melhorEstrelas > (current?.stars ?? 0);
        state.lessons[result.lessonId] = { stars: melhorEstrelas, bestScore: melhorPontos };
    }
    const levelAfter = levelFor(state.xp).level;
    const newAchievements = ACHIEVEMENTS.filter((a) => !isUnlockedAchievement(state, a.id) && a.test(state));
    const quando = now.toISOString();
    for (const a of newAchievements)
        state.achievements[a.id] = quando;
    return {
        state,
        xpGained,
        stars,
        levelBefore,
        levelAfter,
        leveledUp: levelAfter > levelBefore,
        newAchievements,
        streakExtended,
        dailyGoalReached,
        lessonImproved,
    };
}
/**
 * Corrige a ofensiva ao abrir o app: se o último dia jogado não foi hoje
 * nem ontem, a sequência está quebrada e precisa aparecer como zero —
 * senão o app mostraria uma ofensiva que o jogador já perdeu.
 */
export function refreshStreak(state, now = new Date()) {
    const hoje = today(now);
    if (state.lastPlayedDate === hoje || state.lastPlayedDate === dayBefore(hoje))
        return state;
    if (state.streakDays === 0)
        return state;
    return { ...state, streakDays: 0 };
}
/** Percentual geral de acertos. */
export function overallAccuracy(state) {
    return accuracy(state.correct, state.questions);
}
//# sourceMappingURL=progress.js.map