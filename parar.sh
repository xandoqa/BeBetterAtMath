#!/usr/bin/env bash
# Be Better at Math — desliga o ambiente.
#
#   ./parar.sh                  desliga, mantendo os dados do banco
#   ./parar.sh --apagar-dados   desliga e APAGA o banco (não tem volta)
#   ./parar.sh --limpar         remove também as imagens construídas aqui

set -euo pipefail
cd "$(dirname "$0")"

VERDE='\033[38;5;35m'; VERMELHO='\033[38;5;167m'
CINZA='\033[2m'; FORTE='\033[1m'; FIM='\033[0m'

info() { printf "${CINZA}  %s${FIM}\n" "$1"; }
ok()   { printf "${VERDE}  ✓ %s${FIM}\n" "$1"; }
erro() { printf "${VERMELHO}  ✗ %s${FIM}\n" "$1" >&2; }

APAGAR_DADOS=0
LIMPAR=0
for argumento in "$@"; do
  case "$argumento" in
    --apagar-dados) APAGAR_DADOS=1 ;;
    --limpar)       LIMPAR=1 ;;
    -h|--help)
      sed -n '2,7p' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) erro "Opção desconhecida: $argumento"; exit 1 ;;
  esac
done

printf "\n${FORTE}  Desligando o Be Better at Math${FIM}\n\n"

if ! docker info >/dev/null 2>&1; then
  erro "O Docker não está rodando — não há o que desligar."
  exit 0
fi

if [ "$APAGAR_DADOS" -eq 1 ]; then
  printf "${VERMELHO}  Isto apaga TODOS os dados do banco: jogadores, rodadas e ranking.${FIM}\n"
  printf "  Digite ${FORTE}apagar${FIM} para confirmar: "
  read -r confirmacao
  if [ "$confirmacao" != "apagar" ]; then
    info "Cancelado. Nada foi apagado."
    exit 0
  fi
  docker compose down --volumes
  ok "Contêineres parados e dados apagados"
else
  docker compose down
  ok "Contêineres parados; os dados do banco continuam salvos"
fi

if [ "$LIMPAR" -eq 1 ]; then
  info "Removendo as imagens construídas por este projeto..."
  docker compose down --rmi local >/dev/null 2>&1 || true
  ok "Imagens removidas"
fi

printf "\n${CINZA}  Para subir de novo: ./iniciar.sh${FIM}\n\n"
