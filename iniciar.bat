@echo off
REM Be Better at Math - sobe o ambiente completo (banco, API e site).
REM
REM   iniciar.bat              sobe tudo
REM   iniciar.bat --rebuild    reconstroi a imagem da API antes de subir
REM   iniciar.bat --logs       sobe e fica mostrando os logs

setlocal enabledelayedexpansion
cd /d "%~dp0"

set "REBUILD=0"
set "SEGUIR_LOGS=0"

:ler_argumentos
if "%~1"=="" goto fim_argumentos
if /i "%~1"=="--rebuild" set "REBUILD=1"
if /i "%~1"=="--logs"    set "SEGUIR_LOGS=1"
if /i "%~1"=="-h"        goto ajuda
if /i "%~1"=="--help"    goto ajuda
shift
goto ler_argumentos

:ajuda
echo.
echo   iniciar.bat              sobe tudo
echo   iniciar.bat --rebuild    reconstroi a imagem da API antes de subir
echo   iniciar.bat --logs       sobe e fica mostrando os logs
echo.
exit /b 0

:fim_argumentos

echo.
echo   be better at math
echo   Alexandre e Felipe
echo.

REM --- Verificacoes antes de comecar ---------------------------------

where docker >nul 2>&1
if errorlevel 1 (
    echo   [X] Docker nao encontrado.
    echo       Instale o Docker Desktop: https://docs.docker.com/desktop/install/windows-install/
    exit /b 1
)

docker compose version >nul 2>&1
if errorlevel 1 (
    echo   [X] O plugin "docker compose" nao esta disponivel.
    echo       Atualize o Docker Desktop.
    exit /b 1
)

docker info >nul 2>&1
if errorlevel 1 (
    echo   [X] O Docker esta instalado, mas nao esta rodando.
    echo       Abra o Docker Desktop, espere ficar verde e tente de novo.
    exit /b 1
)

REM --- Senha do banco -------------------------------------------------
REM O compose recusa subir sem POSTGRES_PASSWORD, de proposito: um banco
REM com senha "bbam" e um banco sem senha. Geramos uma forte no primeiro uso.

if not exist ".env" (
    echo   Primeira execucao: gerando uma senha para o banco...

    for /f "usebackq delims=" %%P in (`powershell -NoProfile -Command ^
        "[Convert]::ToBase64String((1..24 ^| ForEach-Object {Get-Random -Max 256})) -replace '[/+=]','' ^| ForEach-Object {$_.Substring(0,[Math]::Min(24,$_.Length))}"`) do set "SENHA=%%P"

    if not defined SENHA (
        echo   [X] Nao consegui gerar uma senha aleatoria.
        echo       Crie o .env a mao, copiando o .env.example e pondo uma senha sua.
        exit /b 1
    )

    (
        echo # Gerado por iniciar.bat.
        echo # Este arquivo NAO vai para o Git. Guarde a senha se precisar dela.
        echo.
        echo POSTGRES_USER=bbam
        echo POSTGRES_PASSWORD=!SENHA!
        echo POSTGRES_DB=bbam
        echo POSTGRES_PORT=5432
        echo API_PORT=8000
        echo WEB_PORT=8080
        echo RATE_LIMIT=30
    ) > .env

    echo   [ok] .env criado com senha aleatoria

    REM Um volume que ja existe foi criado com OUTRA senha.
    docker volume inspect bbam-dados-postgres >nul 2>&1
    if not errorlevel 1 (
        echo.
        echo   [X] Ja existe um banco criado com outra senha.
        echo       O PostgreSQL guarda a senha no volume, entao a nova nao vale.
        echo       1. Recomecar o banco:  parar.bat --apagar-dados ^&^& iniciar.bat
        echo       2. Manter os dados:    edite o .env e ponha a senha antiga
        exit /b 1
    )
)

REM --- Portas (valores padrao; mude no .env se precisar) --------------

set "WEB_PORT=8080"
set "API_PORT=8000"
set "POSTGRES_PORT=5432"
if exist ".env" (
    for /f "usebackq tokens=1,2 delims==" %%A in (".env") do (
        if /i "%%A"=="WEB_PORT"      set "WEB_PORT=%%B"
        if /i "%%A"=="API_PORT"      set "API_PORT=%%B"
        if /i "%%A"=="POSTGRES_PORT" set "POSTGRES_PORT=%%B"
    )
)

REM --- Subindo --------------------------------------------------------

if "%REBUILD%"=="1" (
    echo   Reconstruindo a imagem da API...
    docker compose build --no-cache api
    if errorlevel 1 exit /b 1
)

echo   Subindo os conteineres...
docker compose up -d --build
if errorlevel 1 (
    echo   [X] Falha ao subir. Veja: docker compose logs
    exit /b 1
)

REM --- Esperando o banco ----------------------------------------------

echo   Esperando o banco responder...
set "PRONTO=0"
for /l %%i in (1,1,30) do (
    if "!PRONTO!"=="0" (
        docker compose exec -T db pg_isready -U bbam >nul 2>&1
        if not errorlevel 1 (
            set "PRONTO=1"
            echo   [ok] Banco pronto
        ) else (
            timeout /t 2 /nobreak >nul
        )
    )
)
if "!PRONTO!"=="0" (
    echo   [X] O banco nao respondeu em 60 segundos.
    echo       Veja o que houve com: docker compose logs db
    exit /b 1
)

REM --- Esperando a API -------------------------------------------------

echo   Esperando a API responder...
set "API_PRONTA=0"
for /l %%i in (1,1,30) do (
    if "!API_PRONTA!"=="0" (
        curl -fsS "http://localhost:%API_PORT%/api/saude" >nul 2>&1
        if not errorlevel 1 (
            set "API_PRONTA=1"
            echo   [ok] API pronta
        ) else (
            timeout /t 2 /nobreak >nul
        )
    )
)
if "!API_PRONTA!"=="0" (
    echo   [X] A API nao respondeu em 60 segundos.
    echo       Veja o que houve com: docker compose logs api
    exit /b 1
)

echo   [ok] Site pronto
echo.
echo   Tudo no ar
echo     site           http://localhost:%WEB_PORT%
echo     API            http://localhost:%API_PORT%/api/saude
echo     documentacao   http://localhost:%API_PORT%/docs
echo     banco          localhost:%POSTGRES_PORT%
echo.
echo   Para desligar: parar.bat
echo.

if "%SEGUIR_LOGS%"=="1" docker compose logs -f

endlocal
exit /b 0
