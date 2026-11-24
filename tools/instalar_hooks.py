#!/usr/bin/env python3
"""Instala o gancho que trava commit com segredo.

    python3 tools/instalar_hooks.py            # instala
    python3 tools/instalar_hooks.py --remover  # desinstala

Ganchos do Git não são versionados — ficam em .git/hooks, que não vai
para o repositório. Por isso quem clona precisa rodar isto uma vez.
"""

from __future__ import annotations

import argparse
import os
import stat
import subprocess
import sys
from pathlib import Path

GANCHO = """#!/bin/sh
# Instalado por tools/instalar_hooks.py — não edite à mão.
# Para pular numa emergência: git commit --no-verify

if command -v python3 >/dev/null 2>&1; then
    PY=python3
elif command -v python >/dev/null 2>&1; then
    PY=python
else
    echo "checar_segredos: Python não encontrado; pulando a verificação." >&2
    exit 0
fi

exec "$PY" tools/checar_segredos.py --staged
"""


def raiz_do_git() -> Path | None:
    try:
        saida = subprocess.run(
            ["git", "rev-parse", "--git-dir"],
            capture_output=True,
            text=True,
            check=True,
            encoding="utf-8",
        )
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None
    return Path(saida.stdout.strip())


def main() -> int:
    parser = argparse.ArgumentParser(description="Instala o gancho de pre-commit.")
    parser.add_argument("--remover", action="store_true", help="desinstalar o gancho")
    args = parser.parse_args()

    git_dir = raiz_do_git()
    if git_dir is None:
        print("Isto não é um repositório Git (ou o git não está instalado).", file=sys.stderr)
        return 1

    pasta = git_dir / "hooks"
    pasta.mkdir(parents=True, exist_ok=True)
    caminho = pasta / "pre-commit"

    if args.remover:
        if caminho.exists():
            caminho.unlink()
            print("Gancho removido.")
        else:
            print("Não havia gancho instalado.")
        return 0

    if caminho.exists() and "checar_segredos" not in caminho.read_text(encoding="utf-8"):
        print(
            f"Já existe outro gancho em {caminho}.\n"
            "Não vou sobrescrever: junte os dois à mão se quiser os dois.",
            file=sys.stderr,
        )
        return 1

    caminho.write_text(GANCHO, encoding="utf-8")
    # No Windows a permissão é ignorada; no resto, sem isto o Git não roda.
    if os.name != "nt":
        caminho.chmod(caminho.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)

    print(f"✅ Gancho instalado em {caminho}")
    print("   A partir de agora, todo commit passa por tools/checar_segredos.py.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
