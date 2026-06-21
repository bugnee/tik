# TripItKorea 서버 시작 (PATH 미설정 터미널용)
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

$nodePaths = @(
  "C:\Program Files\nodejs",
  (Join-Path $ProjectRoot ".tools\node-v24.16.0-win-x64")
)

$nodeDir = $nodePaths | Where-Object { Test-Path (Join-Path $_ "node.exe") } | Select-Object -First 1
if (-not $nodeDir) {
  Write-Host "Node.js를 찾을 수 없습니다. nodejs.org에서 LTS 설치 후 터미널을 새로 열어주세요." -ForegroundColor Red
  exit 1
}

$env:PATH = "$nodeDir;$env:PATH"
Write-Host "Node: $(node -v)" -ForegroundColor Green

if (-not (Test-Path "node_modules")) {
  Write-Host "npm install 실행 중..."
  npm install
}

if (-not (Test-Path "prisma\dev.db")) {
  Write-Host "DB 초기화 중..."
  npm run db:generate
  npm run db:push
  npm run db:seed
}

Write-Host "`n서버: http://localhost:3000" -ForegroundColor Cyan
Write-Host "종료: Ctrl+C`n"
npm run dev
