# Docker — como rodar tudo

Versão 2.1.0

O Docker sobe três coisas de uma vez: o banco, a API do placar e o site.
É **opcional** — o jogo funciona sem nada disso, só sem o placar compartilhado.

## O que você precisa

- **Docker Desktop** ([Windows](https://docs.docker.com/desktop/install/windows-install/) ·
  [macOS](https://docs.docker.com/desktop/install/mac-install/)) ou
  **Docker Engine** no Linux
- Nada além disso: não precisa de Python, Node ou PostgreSQL instalados

## Subir

**Linux e macOS**

```bash
./iniciar.sh
```

**Windows**

```bat
iniciar.bat
```

Na primeira vez o Docker baixa as imagens e constrói a da API — leva alguns
minutos. Nas seguintes é questão de segundos.

Quando terminar, você verá:

```
  Tudo no ar
    site           http://localhost:8080
    API            http://localhost:8000/api/saude
    documentação   http://localhost:8000/docs
    banco          localhost:5432
```

Abra <http://localhost:8080>, jogue uma rodada e o placar aparece na tela de
resultado.

## Parar

```bash
./parar.sh          # Linux e macOS
parar.bat           # Windows
```

Os dados do banco continuam salvos. Para apagá-los também:

```bash
./parar.sh --apagar-dados
```

O script pede que você digite `apagar` para confirmar, porque não tem volta.

## Opções dos scripts

| Comando | O que faz |
| --- | --- |
| `./iniciar.sh` | Sobe tudo e espera cada serviço responder |
| `./iniciar.sh --rebuild` | Reconstrói a imagem da API do zero antes de subir |
| `./iniciar.sh --logs` | Sobe e fica mostrando os logs ao vivo |
| `./parar.sh` | Desliga, mantendo os dados |
| `./parar.sh --apagar-dados` | Desliga e apaga o banco |
| `./parar.sh --limpar` | Desliga e remove as imagens construídas aqui |

Os `.bat` aceitam exatamente as mesmas opções.

O `iniciar.sh` checa antes de tentar subir: se o Docker não está instalado, se
o serviço não está rodando, se alguma das portas já está ocupada. Cada caso dá
uma mensagem dizendo o que fazer, em vez de um erro do Docker.

## Os três serviços

| Serviço | Imagem | Porta | O que é |
| --- | --- | --- | --- |
| `db` | `postgres:16-alpine` | 5432 | O banco |
| `api` | construída de `server/` | 8000 | A API do placar |
| `web` | `nginx:1.27-alpine` | 8080 | O site |

A API só sobe depois que o banco responde de verdade (`condition:
service_healthy`), não apenas depois que o contêiner existe — é a diferença
entre funcionar e falhar na primeira requisição.

O nginx repassa `/api` para a API, então o navegador vê tudo na mesma origem e
o CORS deixa de ser problema.

O site é montado como volume somente leitura: editar o `index.html` ou o CSS e
recarregar a página já mostra a mudança, sem reconstruir imagem. Se você mexeu
no TypeScript, rode `npm run build` antes.

## Mudar as portas

Copie o exemplo e edite:

```bash
cp .env.example .env
```

```env
WEB_PORT=3000
API_PORT=3001
POSTGRES_PORT=5433
```

Depois `./parar.sh && ./iniciar.sh`.

## Quando algo dá errado

**"A porta 8080 já está em uso"** — outro programa está nela. Mude no `.env` ou
descubra quem é: `lsof -i :8080` (Linux e macOS) ou
`netstat -ano | findstr :8080` (Windows).

**"O Docker está instalado, mas o serviço não está rodando"** — abra o Docker
Desktop e espere o ícone ficar verde. No Linux: `sudo systemctl start docker`.

**A API não sobe** — veja o motivo: `docker compose logs api`. Quase sempre é o
banco ainda subindo na primeira vez; esperar resolve.

**Mudei o `db/init.sql` e nada mudou** — aquele arquivo só roda quando o volume
do banco está vazio. Recrie: `./parar.sh --apagar-dados && ./iniciar.sh`.

**O placar não aparece no site** — ele só aparece quando a API responde. Teste
<http://localhost:8000/api/saude>. Se devolver `"banco": false`, o problema é a
conexão com o Postgres.

## Olhar o banco por dentro

```bash
docker compose exec db psql -U bbam -d bbam
```

```sql
\dt                      -- tabelas
\dv                      -- visões
SELECT * FROM ranking;   -- o placar inteiro
\q                       -- sair
```
