#!/usr/bin/env python3
"""Be Better at Math — versão de terminal.

Mesmas regras da versão web (`src/engine.ts`): rodadas de dez contas,
dez pontos por acerto e dois pontos extras por acerto seguido, com teto
de vinte.

Uso:
    python3 tools/bbam.py                      # menu interativo
    python3 tools/bbam.py --modo tabuada --nivel facil
    python3 tools/bbam.py --modo aleatorio --operacao div --nivel medio

Desenvolvido por Alexandre e Felipe.
"""

from __future__ import annotations

import argparse
import json
import random
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Final

__version__: Final = "2.1.0"

ROUND_LENGTH: Final = 10
RECORDS_PATH: Final = Path.home() / ".bebetteratmath.json"


@dataclass(frozen=True)
class LevelSpec:
    label: str
    minimum: int
    maximum: int


LEVELS: Final[dict[str, LevelSpec]] = {
    "facil": LevelSpec("Fácil", 1, 10),
    "medio": LevelSpec("Médio", 10, 50),
    "dificil": LevelSpec("Difícil", 50, 100),
}

OPERATION_LABELS: Final[dict[str, str]] = {
    "soma": "Soma",
    "sub": "Subtração",
    "mul": "Multiplicação",
    "div": "Divisão",
    "misto": "Misto",
}

SYMBOLS: Final[dict[str, str]] = {"soma": "+", "sub": "−", "mul": "×", "div": "÷"}
MIX_POOL: Final[tuple[str, ...]] = ("soma", "sub", "mul", "div")


@dataclass(frozen=True)
class Question:
    a: int
    b: int
    symbol: str
    answer: int

    @property
    def text(self) -> str:
        return f"{self.a} {self.symbol} {self.b}"


@dataclass(frozen=True)
class RoundResult:
    mode: str
    level: str
    operation: str
    score: int
    hits: int
    total: int
    best_streak: int
    elapsed: float
    misses: tuple[Question, ...]


# --- Regras -----------------------------------------------------------


def make_question(
    mode: str,
    level: str,
    operation: str = "mul",
    rng: random.Random | None = None,
) -> Question:
    """Monta uma conta respeitando a faixa do nível.

    A divisão é construída ao contrário (a = b × quociente) para que o
    resultado seja sempre inteiro; a subtração garante a >= b para não
    produzir negativos.
    """
    r = rng or random
    spec = LEVELS[level]
    low, high = spec.minimum, spec.maximum

    if mode == "tabuada":
        a, b = r.randint(low, high), r.randint(1, 10)
        return Question(a, b, SYMBOLS["mul"], a * b)

    op = r.choice(MIX_POOL) if operation == "misto" else operation

    if op == "soma":
        a, b = r.randint(low, high), r.randint(low, high)
        return Question(a, b, SYMBOLS[op], a + b)
    if op == "sub":
        a = r.randint(low, high)
        b = r.randint(low, a)
        return Question(a, b, SYMBOLS[op], a - b)
    if op == "mul":
        a, b = r.randint(low, high), r.randint(2, 12)
        return Question(a, b, SYMBOLS[op], a * b)
    if op == "div":
        b, quotient = r.randint(2, 12), r.randint(low, high)
        return Question(b * quotient, b, SYMBOLS[op], quotient)

    raise ValueError(f"operação desconhecida: {operation}")


def points_for(streak: int) -> int:
    """Pontos de um acerto; `streak` já conta o acerto atual."""
    return 10 + min(max(streak - 1, 0), 5) * 2


def accuracy(hits: int, total: int) -> int:
    return 0 if total == 0 else round(hits / total * 100)


def format_duration(seconds: float) -> str:
    whole = max(0, round(seconds))
    if whole < 60:
        return f"{whole}s"
    return f"{whole // 60}min {whole % 60:02d}s"


def describe_round(mode: str, level: str, operation: str) -> str:
    head = ["Tabuada"] if mode == "tabuada" else ["Aleatório", OPERATION_LABELS[operation]]
    return " · ".join([*head, LEVELS[level].label])


# --- Recordes ---------------------------------------------------------


def _record_key(result: RoundResult) -> str:
    op = "mul" if result.mode == "tabuada" else result.operation
    return f"{result.mode}:{op}:{result.level}"


def load_records(path: Path = RECORDS_PATH) -> dict[str, int]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    return {k: int(v) for k, v in data.items() if isinstance(v, (int, float))}


def save_if_best(result: RoundResult, path: Path = RECORDS_PATH) -> tuple[bool, int]:
    """Grava o resultado se superar o recorde.

    Retorna (é_recorde_novo, melhor_pontuação).
    """
    records = load_records(path)
    key = _record_key(result)
    previous = records.get(key, 0)

    # zero ponto nunca é recorde, mesmo na primeira rodada
    if result.score <= previous:
        return False, previous

    records[key] = result.score
    try:
        path.write_text(json.dumps(records, indent=2), encoding="utf-8")
    except OSError:
        pass  # sem permissão de escrita: o jogo segue, só não guarda
    return True, result.score


# --- Interface de terminal --------------------------------------------


class Palette:
    """Cores ANSI, desligadas quando a saída não é um terminal."""

    def __init__(self, enabled: bool) -> None:
        self.enabled = enabled

    def _wrap(self, code: str, text: str) -> str:
        return f"\033[{code}m{text}\033[0m" if self.enabled else text

    def bold(self, text: str) -> str:
        return self._wrap("1", text)

    def blue(self, text: str) -> str:
        return self._wrap("38;5;33", text)

    def green(self, text: str) -> str:
        return self._wrap("38;5;35", text)

    def red(self, text: str) -> str:
        return self._wrap("38;5;167", text)

    def dim(self, text: str) -> str:
        return self._wrap("2", text)


def ask_choice(prompt: str, options: dict[str, str], pal: Palette) -> str:
    """Pergunta até receber uma opção válida. Ctrl-C ou EOF encerram."""
    keys = list(options)
    print(f"\n{pal.bold(prompt)}")
    for index, key in enumerate(keys, start=1):
        print(f"  {pal.blue(str(index))}  {options[key]}")

    while True:
        try:
            raw = input(pal.dim("> ")).strip()
        except (EOFError, KeyboardInterrupt):
            print("\nAté a próxima.")
            raise SystemExit(0)

        if raw.isdigit() and 1 <= int(raw) <= len(keys):
            return keys[int(raw) - 1]
        if raw in options:
            return raw
        print(pal.red(f"Escolha um número de 1 a {len(keys)}."))


def play(mode: str, level: str, operation: str, pal: Palette) -> RoundResult:
    score = streak = best_streak = hits = 0
    misses: list[Question] = []
    started = time.monotonic()
    previous: Question | None = None

    print(f"\n{pal.bold(describe_round(mode, level, operation))}")
    print(pal.dim(f"{ROUND_LENGTH} contas. Enter vazio pula a conta.\n"))

    for index in range(1, ROUND_LENGTH + 1):
        question = make_question(mode, level, operation)
        for _ in range(6):  # evita repetir a conta anterior
            if previous is None or question.text != previous.text:
                break
            question = make_question(mode, level, operation)
        previous = question

        label = pal.dim(f"{index:>2}/{ROUND_LENGTH}")
        try:
            raw = input(f"{label}  {pal.bold(question.text)} = ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nRodada interrompida.")
            break

        if raw.lstrip("-").isdigit() and int(raw) == question.answer:
            streak += 1
            best_streak = max(best_streak, streak)
            hits += 1
            earned = points_for(streak)
            score += earned
            print(pal.green(f"       certo  +{earned} pontos"))
        else:
            streak = 0
            misses.append(question)
            print(pal.red(f"       era {question.answer}"))

    return RoundResult(
        mode=mode,
        level=level,
        operation=operation,
        score=score,
        hits=hits,
        total=ROUND_LENGTH,
        best_streak=best_streak,
        elapsed=time.monotonic() - started,
        misses=tuple(misses),
    )


def show_result(result: RoundResult, pal: Palette) -> None:
    is_record, best = save_if_best(result)

    print()
    print(pal.bold(f"  {result.score} pontos"))
    if is_record:
        print(pal.green("  ★ novo recorde"))

    print(pal.dim(f"  acertos        {result.hits} de {result.total} · {accuracy(result.hits, result.total)}%"))
    print(pal.dim(f"  maior sequência {result.best_streak}"))
    print(pal.dim(f"  tempo          {format_duration(result.elapsed)}"))
    print(pal.dim(f"  seu recorde    {best if best > 0 else '—'}"))

    if result.misses:
        print(pal.bold("\n  para revisar"))
        for miss in result.misses:
            print(f"    {miss.text} = {pal.green(str(miss.answer))}")
    print()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="bbam",
        description="Be Better at Math — treino de cálculo mental no terminal.",
    )
    parser.add_argument("--modo", choices=["tabuada", "aleatorio"])
    parser.add_argument("--nivel", choices=list(LEVELS))
    parser.add_argument("--operacao", choices=list(OPERATION_LABELS), default="soma")
    parser.add_argument("--sem-cor", action="store_true", help="desliga as cores ANSI")
    parser.add_argument("--version", action="version", version=f"bbam {__version__}")
    args = parser.parse_args(argv)

    pal = Palette(enabled=sys.stdout.isatty() and not args.sem_cor)

    print(pal.blue(pal.bold("\n  be better at math")))
    print(pal.dim(f"  Alexandre e Felipe · v{__version__}"))

    mode = args.modo or ask_choice(
        "O que vamos treinar?",
        {"tabuada": "Tabuada", "aleatorio": "Números aleatórios"},
        pal,
    )

    operation = args.operacao
    if mode == "aleatorio" and not args.modo:
        operation = ask_choice("Qual operação?", OPERATION_LABELS, pal)

    level = args.nivel or ask_choice(
        "Qual nível?",
        {key: f"{spec.label} ({spec.minimum}–{spec.maximum})" for key, spec in LEVELS.items()},
        pal,
    )

    show_result(play(mode, level, operation, pal), pal)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
