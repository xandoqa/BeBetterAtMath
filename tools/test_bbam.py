#!/usr/bin/env python3
"""Testes das regras do jogo.

Rode com:
    python3 -m unittest discover -s tools -v
"""

from __future__ import annotations

import random
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from bbam import (  # noqa: E402
    LEVELS,
    OPERATION_LABELS,
    ROUND_LENGTH,
    Question,
    RoundResult,
    accuracy,
    describe_round,
    format_duration,
    load_records,
    make_question,
    points_for,
    save_if_best,
)

REPETITIONS = 2000


class TestQuestionGeneration(unittest.TestCase):
    """As contas precisam respeitar o nível e nunca sair com resto."""

    def setUp(self) -> None:
        self.rng = random.Random(20261102)

    def test_tabuada_respeita_a_faixa_do_nivel(self) -> None:
        for level, spec in LEVELS.items():
            with self.subTest(level=level):
                for _ in range(REPETITIONS):
                    q = make_question("tabuada", level, rng=self.rng)
                    self.assertGreaterEqual(q.a, spec.minimum)
                    self.assertLessEqual(q.a, spec.maximum)
                    self.assertIn(q.b, range(1, 11))
                    self.assertEqual(q.answer, q.a * q.b)

    def test_divisao_sempre_exata(self) -> None:
        for level in LEVELS:
            with self.subTest(level=level):
                for _ in range(REPETITIONS):
                    q = make_question("aleatorio", level, "div", rng=self.rng)
                    self.assertEqual(q.a % q.b, 0)
                    self.assertEqual(q.answer, q.a // q.b)

    def test_subtracao_nunca_negativa(self) -> None:
        for level in LEVELS:
            with self.subTest(level=level):
                for _ in range(REPETITIONS):
                    q = make_question("aleatorio", level, "sub", rng=self.rng)
                    self.assertGreaterEqual(q.answer, 0)

    def test_misto_sorteia_as_quatro_operacoes(self) -> None:
        symbols = {
            make_question("aleatorio", "facil", "misto", rng=self.rng).symbol
            for _ in range(REPETITIONS)
        }
        self.assertEqual(symbols, {"+", "−", "×", "÷"})

    def test_operacao_desconhecida_levanta_erro(self) -> None:
        with self.assertRaises(ValueError):
            make_question("aleatorio", "facil", "potencia", rng=self.rng)


class TestScoring(unittest.TestCase):
    def test_pontos_crescem_com_a_sequencia_ate_o_teto(self) -> None:
        self.assertEqual(points_for(1), 10)
        self.assertEqual(points_for(2), 12)
        self.assertEqual(points_for(6), 20)
        self.assertEqual(points_for(50), 20, "a pontuação precisa ter teto")

    def test_pontos_nao_ficam_negativos(self) -> None:
        self.assertEqual(points_for(0), 10)

    def test_precisao(self) -> None:
        self.assertEqual(accuracy(7, 10), 70)
        self.assertEqual(accuracy(0, 0), 0, "rodada vazia não pode dividir por zero")

    def test_duracao_formatada(self) -> None:
        self.assertEqual(format_duration(48), "48s")
        self.assertEqual(format_duration(72), "1min 12s")
        self.assertEqual(format_duration(-5), "0s")

    def test_descricao_da_rodada(self) -> None:
        self.assertEqual(describe_round("tabuada", "facil", "mul"), "Tabuada · Fácil")
        self.assertEqual(
            describe_round("aleatorio", "medio", "div"),
            f"Aleatório · {OPERATION_LABELS['div']} · Médio",
        )


class TestRecords(unittest.TestCase):
    def _result(self, score: int) -> RoundResult:
        return RoundResult(
            mode="tabuada",
            level="facil",
            operation="mul",
            score=score,
            hits=score // 10,
            total=ROUND_LENGTH,
            best_streak=3,
            elapsed=42.0,
            misses=(Question(2, 3, "×", 6),),
        )

    def test_so_grava_quando_supera_o_recorde(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "records.json"

            self.assertEqual(save_if_best(self._result(80), path), (True, 80))
            self.assertEqual(save_if_best(self._result(50), path), (False, 80))
            self.assertEqual(save_if_best(self._result(120), path), (True, 120))
            self.assertEqual(load_records(path), {"tabuada:mul:facil": 120})

    def test_zero_ponto_nunca_e_recorde(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "records.json"
            self.assertEqual(save_if_best(self._result(0), path), (False, 0))
            self.assertEqual(load_records(path), {})

    def test_arquivo_ausente_ou_corrompido_vira_dicionario_vazio(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            missing = Path(folder) / "nao-existe.json"
            self.assertEqual(load_records(missing), {})

            broken = Path(folder) / "quebrado.json"
            broken.write_text("{isto não é json", encoding="utf-8")
            self.assertEqual(load_records(broken), {})


if __name__ == "__main__":
    unittest.main(verbosity=2)
