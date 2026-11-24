# API do placar — Be Better at Math
FROM python:3.12-slim

# Python não escreve .pyc e não bufferiza a saída: o log aparece na hora
# no `docker compose logs`.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# As dependências vêm antes do código: enquanto o requirements.txt não
# mudar, o Docker reaproveita esta camada e o build fica rápido.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

# Não rodar como root dentro do contêiner.
RUN useradd --create-home --uid 1000 bbam && chown -R bbam:bbam /app
USER bbam

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
