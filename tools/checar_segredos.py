#!/usr/bin/env python3
"""Impede que segredo entre no repositório.

Roda em dois momentos:
  - antes de cada commit, pelo gancho instalado por tools/instalar_hooks.py
  - na integração contínua, sobre tudo que está versionado

Uso:
    python3 tools/checar_segredos.py            # tudo que está versionado
    python3 tools/checar_segredos.py --staged   # só o que entraria no commit

Sai com 1 se achar algo, para travar o commit ou reprovar a CI.

Isto reduz o risco, não o elimina: nenhum verificador reconhece toda
forma de segredo. A proteção que importa é o .gitignore; esta é a rede
embaixo dela.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path
from typing import Final, Iterable, NamedTuple


class Regra(NamedTuple):
    nome: str
    padrao: re.Pattern[str]


# Padrões de segredo de verdade. Preferimos poucos e precisos: uma regra
# que dispara à toa treina as pessoas a ignorar o aviso.
REGRAS: Final[tuple[Regra, ...]] = (
    Regra("chave privada", re.compile(r"-----BEGIN (RSA |EC |OPENSSH |PGP )?PRIVATE KEY")),
    Regra("token do GitHub", re.compile(r"\bgh[pousr]_[A-Za-z0-9]{36,}")),
    Regra("chave da AWS", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    Regra("token do Slack", re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{10,}")),
    Regra("chave da OpenAI", re.compile(r"\bsk-[A-Za-z0-9]{32,}\b")),
    Regra("chave da Anthropic", re.compile(r"\bsk-ant-[A-Za-z0-9_-]{20,}")),
    # Os caracteres {, } e $ excluídos propositalmente: uma URL montada a
    # partir de variáveis ("postgresql://{user}:{password}@...") é molde,
    # não segredo.
    Regra(
        "URL com senha embutida",
        re.compile(r"://[^/\s:@{}$]+:[^/\s:@{}$]{3,}@[^/\s]+"),
    ),
    Regra(
        "senha em código",
        re.compile(
            r"""(?ix)
            \b (?: password | passwd | senha | secret | api[_-]?key | access[_-]?token )
            \s* [:=] \s*
            ['"]                 # só com aspas: pega valor literal, não variável
            (?! \s* $ )
            (?! \$ )             # ${VAR} é referência, não segredo
            (?! \{ )
            [^'"]{8,}
            ['"]
            """
        ),
    ),
)

# Arquivos que falam de segredo sem conter nenhum: documentação, modelos
# e este próprio verificador.
ISENTOS: Final[frozenset[str]] = frozenset(
    {
        ".env.example",
        "tools/checar_segredos.py",
        "tools/instalar_hooks.py",
        "SECURITY.md",
        "docs/problemas.md",
        "docs/api.md",
        "docs/vscode.md",
        "docs/docker.md",
        "docs/banco-de-dados.md",
        "README.md",
        "CHANGELOG.md",
    }
)

# Nunca podem ser versionados, com ou sem conteúdo suspeito.
PROIBIDOS: Final[tuple[re.Pattern[str], ...]] = (
    re.compile(r"(^|/)\.env$"),
    re.compile(r"(^|/)\.env\.(?!example$)"),
    re.compile(r"\.(pem|key|p12|pfx|keystore|jks)$"),
    re.compile(r"(^|/)id_(rsa|dsa|ecdsa|ed25519)$"),
    re.compile(r"(^|/)\.npmrc$"),
    re.compile(r"(^|/)\.pgpass$"),
)

BINARIOS: Final[frozenset[str]] = frozenset(
    {".png", ".jpg", ".jpeg", ".gif", ".ico", ".webp", ".pdf", ".zip", ".woff", ".woff2"}
)


def git(*args: str) -> list[str]:
    saida = subprocess.run(
        ["git", *args], capture_output=True, text=True, check=False, encoding="utf-8"
    )
    return [linha for linha in saida.stdout.splitlines() if linha.strip()]


def arquivos(somente_staged: bool) -> list[str]:
    if somente_staged:
        return git("diff", "--cached", "--name-only", "--diff-filter=ACM")
    return git("ls-files")


def achados(caminhos: Iterable[str]) -> list[str]:
    problemas: list[str] = []

    for caminho in caminhos:
        for proibido in PROIBIDOS:
            if proibido.search(caminho):
                problemas.append(f"{caminho}: este arquivo nunca deve ser versionado")
                break

        if caminho in ISENTOS or Path(caminho).suffix.lower() in BINARIOS:
            continue

        arquivo = Path(caminho)
        if not arquivo.is_file():
            continue

        try:
            texto = arquivo.read_text(encoding="utf-8", errors="strict")
        except (UnicodeDecodeError, OSError):
            continue  # binário ou ilegível: nada a procurar

        for numero, linha in enumerate(texto.splitlines(), 1):
            if len(linha) > 500:
                continue  # linha enorme costuma ser dado embutido, não código
            for regra in REGRAS:
                if regra.padrao.search(linha):
                    recorte = linha.strip()[:70]
                    problemas.append(f"{caminho}:{numero}: {regra.nome} — {recorte}")
                    break

    return problemas


def main() -> int:
    parser = argparse.ArgumentParser(description="Procura segredo prestes a ser versionado.")
    parser.add_argument(
        "--staged",
        action="store_true",
        help="olhar só o que está preparado para o commit",
    )
    args = parser.parse_args()

    alvos = arquivos(args.staged)
    if not alvos:
        print("Nada a verificar.")
        return 0

    problemas = achados(alvos)

    if not problemas:
        print(f"✅ {len(alvos)} arquivo(s) verificado(s), nenhum segredo encontrado.")
        return 0

    print(f"\n❌ {len(problemas)} problema(s):\n", file=sys.stderr)
    for problema in problemas:
        print(f"   {problema}", file=sys.stderr)
    print(
        "\nSe for alarme falso, acrescente o arquivo a ISENTOS em"
        "\ntools/checar_segredos.py — e confira duas vezes antes.\n"
        "\nSe for segredo de verdade e já foi commitado, tirar do próximo\n"
        "commit NÃO basta: o valor fica no histórico. Troque o segredo.\n",
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
