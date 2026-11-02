/**
 * Ligação entre as regras do jogo e a tela.
 *
 * Toda interação passa por delegação de eventos nos atributos
 * `data-action`, para que o HTML não precise de `onclick` embutido.
 */

import {
  LEVELS,
  OPERATION_LABELS,
  ROUND_LENGTH,
  VERSION,
  accuracy,
  describeRound,
  formatDuration,
  makeQuestion,
  pointsFor,
  type Level,
  type Mode,
  type Operation,
  type Question,
  type RoundResult,
} from "./engine.js";

import {
  clearRecords,
  getBest,
  getNickname,
  getTheme,
  saveIfBest,
  setNickname,
  setTheme,
  type ThemeChoice,
} from "./storage.js";

import { fetchRanking, isAvailable, submitRound } from "./api.js";

/* --- Acesso ao DOM ----------------------------------------- */

function one<T extends Element = HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`Elemento ausente no HTML: ${selector}`);
  return node;
}

const screens = new Map<string, HTMLElement>();
document.querySelectorAll<HTMLElement>("[data-screen]").forEach((node) => {
  screens.set(node.dataset.screen!, node);
});

const ui = {
  worksheet: one<HTMLFormElement>("[data-answer-form]"),
  answer: one<HTMLInputElement>("[data-answer]"),
  operation: one("[data-operation]"),
  feedback: one("[data-feedback]"),
  progress: one("[data-progress]"),
  progressBar: one("[data-progress-bar]"),
  score: one("[data-score]"),
  streak: one("[data-streak]"),
  opTitle: one("[data-op-title]"),
  themeIcon: one("[data-theme-icon]"),
  resultMode: one("[data-result-mode]"),
  resultScore: one("[data-result-score]"),
  resultHits: one("[data-result-hits]"),
  resultStreak: one("[data-result-streak]"),
  resultTime: one("[data-result-time]"),
  resultBest: one("[data-result-best]"),
  resultRecord: one("[data-result-record]"),
  missesWrap: one("[data-misses-wrap]"),
  misses: one("[data-misses]"),
  version: one("[data-version]"),
  board: one("[data-board]"),
  boardList: one<HTMLOListElement>("[data-board-list]"),
  boardNote: one("[data-board-note]"),
  joinForm: one<HTMLFormElement>("[data-join-form]"),
  nickname: one<HTMLInputElement>("[data-nickname]"),
};

/* --- Estado ------------------------------------------------- */

interface GameState {
  mode: Mode;
  level: Level;
  operation: Operation;
  index: number;
  score: number;
  streak: number;
  bestStreak: number;
  hits: number;
  startedAt: number;
  current: Question | null;
  misses: Question[];
  locked: boolean;
}

let game: GameState | null = null;
let pendingOperation: Operation = "sum";
let advanceTimer: number | undefined;

const PRAISE = ["Isso!", "Certo.", "Boa.", "Exato.", "É isso aí."] as const;

/* --- Navegação ---------------------------------------------- */

function showScreen(name: string): void {
  screens.forEach((node, key) => {
    const active = key === name;
    node.hidden = !active;
    node.classList.toggle("is-hidden", !active);
  });
}

function cancelAdvance(): void {
  if (advanceTimer !== undefined) {
    window.clearTimeout(advanceTimer);
    advanceTimer = undefined;
  }
}

function goMenu(): void {
  cancelAdvance();
  game = null;
  showScreen("menu");
}

/* --- Rodada -------------------------------------------------- */

function startRound(mode: Mode, level: Level): void {
  cancelAdvance();
  game = {
    mode,
    level,
    operation: mode === "tabuada" ? "mul" : pendingOperation,
    index: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    hits: 0,
    startedAt: Date.now(),
    current: null,
    misses: [],
    locked: false,
  };

  showScreen("game");
  renderScore();
  nextQuestion();
}

function nextQuestion(): void {
  if (!game) return;

  if (game.index >= ROUND_LENGTH) {
    endRound();
    return;
  }

  // evita repetir a mesma conta duas vezes seguidas
  let question = makeQuestion(game.mode, game.level, game.operation);
  for (let tries = 0; tries < 6 && question.text === game.current?.text; tries += 1) {
    question = makeQuestion(game.mode, game.level, game.operation);
  }

  game.current = question;
  game.locked = false;

  ui.operation.textContent = `${question.text} =`;
  ui.answer.value = "";
  ui.answer.disabled = false;
  ui.feedback.textContent = "";
  ui.feedback.className = "feedback";
  ui.worksheet.className = "worksheet";
  ui.progress.textContent = `${game.index + 1} / ${ROUND_LENGTH}`;
  ui.progressBar.style.transform = `scaleX(${game.index / ROUND_LENGTH})`;

  ui.answer.focus();
}

function renderScore(): void {
  if (!game) return;
  ui.score.textContent = String(game.score);
  ui.streak.textContent = String(game.streak);
}

function submitAnswer(): void {
  if (!game || !game.current || game.locked) return;

  const raw = ui.answer.value.trim();
  if (!/^-?\d+$/.test(raw)) {
    ui.feedback.textContent = "Escreva um número para responder.";
    ui.feedback.className = "feedback";
    ui.answer.focus();
    return;
  }

  const question = game.current;
  const correct = Number(raw) === question.answer;

  game.locked = true;
  game.index += 1;
  ui.answer.disabled = true;

  if (correct) {
    game.streak += 1;
    game.bestStreak = Math.max(game.bestStreak, game.streak);
    game.hits += 1;
    const earned = pointsFor(game.streak);
    game.score += earned;

    const praise = PRAISE[Math.floor(Math.random() * PRAISE.length)]!;
    ui.feedback.textContent = `${praise} +${earned} pontos`;
    ui.feedback.className = "feedback is-right";
    ui.worksheet.className = "worksheet is-right";
  } else {
    game.streak = 0;
    game.misses.push(question);
    ui.feedback.textContent = `${question.text} = ${question.answer}`;
    ui.feedback.className = "feedback is-wrong";
    ui.worksheet.className = "worksheet is-wrong";
  }

  renderScore();
  ui.progressBar.style.transform = `scaleX(${game.index / ROUND_LENGTH})`;

  advanceTimer = window.setTimeout(nextQuestion, correct ? 620 : 1700);
}

function endRound(): void {
  if (!game) return;

  const result: RoundResult = {
    mode: game.mode,
    level: game.level,
    operation: game.operation,
    score: game.score,
    hits: game.hits,
    total: ROUND_LENGTH,
    bestStreak: game.bestStreak,
    elapsedMs: Date.now() - game.startedAt,
    misses: [...game.misses],
  };

  const isRecord = saveIfBest(result);
  const best = getBest(result.mode, result.operation, result.level);

  ui.resultMode.textContent = describeRound(result.mode, result.level, result.operation);
  ui.resultScore.textContent = String(result.score);
  ui.resultHits.textContent = `${result.hits} de ${result.total} · ${accuracy(result.hits, result.total)}%`;
  ui.resultStreak.textContent = String(result.bestStreak);
  ui.resultTime.textContent = formatDuration(result.elapsedMs);
  ui.resultBest.textContent = best ? `${best.score} pts` : "—";

  ui.resultRecord.classList.toggle("is-hidden", !isRecord);
  ui.resultRecord.textContent = isRecord ? "Novo recorde" : "";

  const hasMisses = result.misses.length > 0;
  ui.missesWrap.classList.toggle("is-hidden", !hasMisses);
  ui.misses.replaceChildren(
    ...result.misses.map((miss) => {
      const item = document.createElement("li");
      item.append(`${miss.text} = `);
      const value = document.createElement("b");
      value.textContent = String(miss.answer);
      item.append(value);
      return item;
    }),
  );

  showScreen("results");

  // O placar é um extra: a tela de resultado não espera por ele.
  void showBoard(result);
}

/* --- Placar compartilhado (opcional) --------------------------- */

let lastResult: RoundResult | null = null;

async function showBoard(result: RoundResult): Promise<void> {
  lastResult = result;
  ui.board.classList.add("is-hidden");

  if (!(await isAvailable())) return;
  ui.board.classList.remove("is-hidden");

  const apelido = getNickname();
  ui.joinForm.classList.toggle("is-hidden", apelido !== null);

  if (apelido) {
    const saved = await submitRound(result, apelido);
    ui.boardNote.textContent =
      saved?.posicao != null
        ? `Você está em ${saved.posicao}º nesta categoria, com ${saved.melhor_pessoal} pontos.`
        : "Não deu para enviar esta rodada agora.";
  } else {
    ui.boardNote.textContent = "Escolha um apelido para aparecer no placar.";
  }

  await renderRanking(result);
}

async function renderRanking(result: RoundResult): Promise<void> {
  const rows = await fetchRanking(result.mode, result.operation, result.level);
  const mine = getNickname()?.toLowerCase();

  ui.boardList.replaceChildren(
    ...rows.map((row) => {
      const item = document.createElement("li");
      item.className = "board__row";
      if (row.apelido.toLowerCase() === mine) item.classList.add("is-me");

      const name = document.createElement("span");
      name.className = "board__name";
      name.textContent = row.apelido;

      const score = document.createElement("span");
      score.className = "board__points";
      score.textContent = `${row.pontos}`;

      item.append(name, score);
      return item;
    }),
  );

  if (rows.length === 0) {
    ui.boardNote.textContent = "Ninguém pontuou nesta categoria ainda. Seja o primeiro.";
  }
}

/* --- Tema ---------------------------------------------------- */

const THEME_CYCLE: readonly ThemeChoice[] = ["auto", "light", "dark"];
const THEME_ICONS: Record<ThemeChoice, string> = { auto: "◐", light: "☀", dark: "☾" };

function applyTheme(choice: ThemeChoice): void {
  document.documentElement.dataset.theme = choice;
  ui.themeIcon.textContent = THEME_ICONS[choice];
}

function cycleTheme(): void {
  const next = THEME_CYCLE[(THEME_CYCLE.indexOf(getTheme()) + 1) % THEME_CYCLE.length]!;
  setTheme(next);
  applyTheme(next);
}

/* --- Eventos -------------------------------------------------- */

document.addEventListener("click", (event) => {
  const trigger = (event.target as Element | null)?.closest<HTMLElement>("[data-action]");

  if (!trigger) {
    // qualquer clique na abertura avança para o menu
    if (!screens.get("splash")?.hidden) goMenu();
    return;
  }

  switch (trigger.dataset.action) {
    case "goto":
      cancelAdvance();
      showScreen(trigger.dataset.target!);
      break;

    case "pick-op": {
      pendingOperation = trigger.dataset.op as Operation;
      ui.opTitle.textContent = OPERATION_LABELS[pendingOperation];
      showScreen("randomLevel");
      break;
    }

    case "start":
      startRound(trigger.dataset.mode as Mode, trigger.dataset.level as Level);
      break;

    case "again":
      if (game) startRound(game.mode, game.level);
      break;

    case "quit":
      goMenu();
      break;

    case "toggle-theme":
      cycleTheme();
      break;

    case "reset-records":
      if (window.confirm("Apagar todos os recordes salvos neste aparelho?")) {
        clearRecords();
        trigger.textContent = "Recordes apagados";
        window.setTimeout(() => {
          trigger.textContent = "Apagar meus recordes";
        }, 2000);
      }
      break;
  }
});

ui.worksheet.addEventListener("submit", (event) => {
  event.preventDefault();
  submitAnswer();
});

ui.joinForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const apelido = ui.nickname.value.trim();
  if (apelido.length < 2) {
    ui.boardNote.textContent = "O apelido precisa de ao menos dois caracteres.";
    return;
  }
  setNickname(apelido);
  ui.joinForm.classList.add("is-hidden");
  if (lastResult) void showBoard(lastResult);
});

document.addEventListener("keydown", (event) => {
  if (!screens.get("splash")?.hidden) {
    goMenu();
    return;
  }
  if (event.key === "Escape" && !screens.get("game")?.hidden) goMenu();
});

/* --- Início ---------------------------------------------------- */

applyTheme(getTheme());
ui.version.textContent = `Versão ${VERSION}`;

// a abertura some sozinha, mas pode ser pulada a qualquer momento
window.setTimeout(() => {
  if (!screens.get("splash")?.hidden) goMenu();
}, 1800);

// torna as faixas de cada nível visíveis sem repetir os números no HTML
document.querySelectorAll<HTMLElement>("[data-level]").forEach((node) => {
  const spec = LEVELS[node.dataset.level as Level];
  const desc = node.querySelector(".card-btn__desc");
  if (spec && desc && node.dataset.mode === "random") {
    desc.textContent = `Números de ${spec.min} a ${spec.max}`;
  }
});
