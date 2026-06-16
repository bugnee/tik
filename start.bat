@echo off
setlocal
cd /d "%~dp0"

if exist "C:\Program Files\nodejs\node.exe" (
  set "PATH=C:\Program Files\nodejs;%PATH%"
) else if exist "%~dp0.tools\node-v24.16.0-win-x64\node.exe" (
  set "PATH=%~dp0.tools\node-v24.16.0-win-x64;%PATH%"
) else (
  echo Node.js를 찾을 수 없습니다.
  echo https://nodejs.org 에서 LTS 버전을 설치한 뒤 터미널을 새로 열어주세요.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo 의존성 설치 중...
  call npm install
)

if not exist "prisma\dev.db" (
  echo DB 초기화 중...
  call npm run db:generate
  call npm run db:push
  call npm run db:seed
)

echo.
echo 서버 시작: http://localhost:3000
echo 종료: Ctrl+C
echo.
call npm run dev
