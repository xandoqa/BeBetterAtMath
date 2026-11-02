@echo off
REM Be Better at Math - desliga o ambiente.
REM
REM   parar.bat                  desliga, mantendo os dados do banco
REM   parar.bat --apagar-dados   desliga e APAGA o banco (nao tem volta)
REM   parar.bat --limpar         remove tambem as imagens construidas aqui

setlocal enabledelayedexpansion
cd /d "%~dp0"

set "APAGAR_DADOS=0"
set "LIMPAR=0"

:ler_argumentos
if "%~1"=="" goto fim_argumentos
if /i "%~1"=="--apagar-dados" set "APAGAR_DADOS=1"
if /i "%~1"=="--limpar"       set "LIMPAR=1"
if /i "%~1"=="-h"             goto ajuda
if /i "%~1"=="--help"         goto ajuda
shift
goto ler_argumentos

:ajuda
echo.
echo   parar.bat                  desliga, mantendo os dados do banco
echo   parar.bat --apagar-dados   desliga e APAGA o banco (nao tem volta)
echo   parar.bat --limpar         remove tambem as imagens construidas aqui
echo.
exit /b 0

:fim_argumentos

echo.
echo   Desligando o Be Better at Math
echo.

docker info >nul 2>&1
if errorlevel 1 (
    echo   O Docker nao esta rodando - nao ha o que desligar.
    exit /b 0
)

if "%APAGAR_DADOS%"=="1" (
    echo   ATENCAO: isto apaga TODOS os dados do banco:
    echo   jogadores, rodadas e ranking.
    echo.
    set /p "CONFIRMACAO=  Digite apagar para confirmar: "
    if /i not "!CONFIRMACAO!"=="apagar" (
        echo   Cancelado. Nada foi apagado.
        exit /b 0
    )
    docker compose down --volumes
    echo   [ok] Conteineres parados e dados apagados
) else (
    docker compose down
    echo   [ok] Conteineres parados; os dados do banco continuam salvos
)

if "%LIMPAR%"=="1" (
    echo   Removendo as imagens construidas por este projeto...
    docker compose down --rmi local >nul 2>&1
    echo   [ok] Imagens removidas
)

echo.
echo   Para subir de novo: iniciar.bat
echo.

endlocal
exit /b 0
