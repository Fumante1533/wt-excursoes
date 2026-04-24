@echo off


echo Iniciando o servidor do Backend...
REM Abre uma nova janela de comando, define o título, navega até a pasta do backend e inicia o servidor.
start "Backend Server" cmd /c "cd backend && npm run dev"


echo Iniciando o servidor do Frontend...
REM Abre uma nova janela de comando, define o título, navega até a pasta do frontend e inicia o servidor.
start "Frontend Server" cmd /c "cd frontend && npm run dev"

echo.
echo Servidores do frontend e backend estao sendo iniciados em novas janelas.
echo Aguarde a conclusao da instalacao das dependencias e o inicio dos servidores.
echo.
EXIT