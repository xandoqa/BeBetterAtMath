#!/usr/bin/env bash
# Be Better at Math — sobe o ambiente completo (banco, API e site).
#
#   ./iniciar.sh              sobe tudo
#   ./iniciar.sh --rebuild    reconstrói a imagem da API antes de subir
#   ./iniciar.sh --logs       sobe e fica mostrando os logs

set -euo pipefail
cd "$(dirname "$0")"

AZUL='\033[38;5;33m'; VERDE='\033[38;5;35m'; VERMELHO='\033[38;5;167m'
CINZA='\033[2m'; FORTE='\033[1m'; FIM='\033[0m'

info()  { printf "${CINZA}  %s${FIM}\n" "$1"; }
ok()    { printf "${VERDE}  ✓ %s${FIM}\n" "$1"; }
erro()  { printf "${VERMELHO}  ✗ %s${FIM}\n" "$1" >&2; }

REBUILD=0
SEGUIR_LOGS=0
for argumento in "$@"; do
  case "$argumento" in
    --rebuild) REBUILD=1 ;;
    --logs)    SEGUIR_LOGS=1 ;;
    -h|--help)
      sed -n '2,8p' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) erro "Opção desconhecida: $argumento"; exit 1 ;;
  esac
done

printf "\n${AZUL}${FORTE}  be better at math${FIM}\n"
printf "${CINZA}  Alexandre e Felipe${FIM}\n\n"

# --- Verificações antes de começar -----------------------------------

if ! command -v docker >/dev/null 2>&1; then
  erro "Docker não encontrado."
  info "Instale em https://docs.docker.com/get-docker/"
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  erro "O plugin 'docker compose' não está disponível."
  info "Atualize o Docker Desktop, ou instale o docker-compose-plugin."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  erro "O Docker está instalado, mas o serviço não está rodando."
  info "Abra o Docker Desktop (ou rode: sudo systemctl start docker) e tente de novo."
  exit 1
fi

# --- Portas ocupadas ---------------------------------------------------

porta_ocupada() {
  if command -v nc >/dev/null 2>&1; then
    nc -z localhost "$1" >/dev/null 2>&1
  else
    return 1
  fi
}

for par in "${WEB_PORT:-8080}:site" "${API_PORT:-8000}:API" "${POSTGRES_PORT:-5432}:banco"; do
  porta="${par%%:*}"; nome="${par##*:}"
  if porta_ocupada "$porta"; then
    erro "A porta $porta (${nome}) já está em uso."
    info "Rode ./parar.sh, ou mude a porta no arquivo .env."
    exit 1
  fi
done

# --- Subindo -----------------------------------------------------------

if [ "$REBUILD" -eq 1 ]; then
  info "Reconstruindo a imagem da API..."
  docker compose build --no-cache api
fi

info "Subindo os contêineres..."
docker compose up -d --build

# --- Esperando o banco e a API ficarem prontos -------------------------

info "Esperando o banco responder..."
for tentativa in $(seq 1 30); do
  if docker compose exec -T db pg_isready -U "${POSTGRES_USER:-bbam}" >/dev/null 2>&1; then
    ok "Banco pronto"
    break
  fi
  if [ "$tentativa" -eq 30 ]; then
    erro "O banco não respondeu em 60 segundos."
    info "Veja o que houve com: docker compose logs db"
    exit 1
  fi
  sleep 2
done

info "Esperando a API responder..."
for tentativa in $(seq 1 30); do
  if curl -fsS "http://localhost:${API_PORT:-8000}/api/saude" >/dev/null 2>&1; then
    ok "API pronta"
    break
  fi
  if [ "$tentativa" -eq 30 ]; then
    erro "A API não respondeu em 60 segundos."
    info "Veja o que houve com: docker compose logs api"
    exit 1
  fi
  sleep 2
done

ok "Site pronto"

printf "\n${FORTE}  Tudo no ar${FIM}\n"
printf "    site           ${AZUL}http://localhost:${WEB_PORT:-8080}${FIM}\n"
printf "    API            ${AZUL}http://localhost:${API_PORT:-8000}/api/saude${FIM}\n"
printf "    documentação   ${AZUL}http://localhost:${API_PORT:-8000}/docs${FIM}\n"
printf "    banco          ${CINZA}localhost:${POSTGRES_PORT:-5432}${FIM}\n\n"
printf "${CINZA}  Para desligar: ./parar.sh${FIM}\n\n"

if [ "$SEGUIR_LOGS" -eq 1 ]; then
  docker compose logs -f
fi
