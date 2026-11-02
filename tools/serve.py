#!/usr/bin/env python3
"""Servidor local para desenvolvimento.

Abrir o index.html direto do disco não funciona: o navegador bloqueia
módulos ES carregados por `file://`. Este servidor resolve isso e ainda
desliga o cache, para que uma recompilação apareça no primeiro recarregamento.

Uso:
    python3 tools/serve.py            # http://localhost:8000
    python3 tools/serve.py --porta 3000 --abrir
"""

from __future__ import annotations

import argparse
import contextlib
import socket
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent


class NoCacheHandler(SimpleHTTPRequestHandler):
    """Serve o projeto sem cache e com os tipos MIME corretos."""

    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".css": "text/css",
        ".map": "application/json",
    }

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()

    def log_message(self, format: str, *args: object) -> None:
        # só erros: o log de cada asset polui o terminal
        status = str(args[1]) if len(args) > 1 else ""
        if status.startswith(("4", "5")):
            super().log_message(format, *args)


def main() -> int:
    parser = argparse.ArgumentParser(description="Servidor local do Be Better at Math.")
    parser.add_argument("--porta", type=int, default=8000)
    parser.add_argument("--abrir", action="store_true", help="abre o navegador ao iniciar")
    args = parser.parse_args()

    handler = partial(NoCacheHandler, directory=str(PROJECT_ROOT))

    try:
        server = ThreadingHTTPServer(("127.0.0.1", args.porta), handler)
    except OSError as error:
        if isinstance(error, socket.error) and error.errno in (48, 98):
            print(f"A porta {args.porta} já está em uso. Tente --porta {args.porta + 1}.")
            return 1
        raise

    url = f"http://localhost:{args.porta}/"
    print(f"Servindo {PROJECT_ROOT} em {url}")
    print("Ctrl-C para parar.")

    if args.abrir:
        webbrowser.open(url)

    with contextlib.suppress(KeyboardInterrupt):
        server.serve_forever()

    server.server_close()
    print("\nServidor encerrado.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
