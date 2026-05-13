#Requires -Version 5.1
<#
.SYNOPSIS
    Instalacao automatica da Focus Engine em Windows.

.DESCRIPTION
    Verifica os requisitos, instala dependencias, prepara a base de dados
    SQLite e oferece arrancar o servidor de desenvolvimento.

    Correr a partir da pasta da Focus Engine:
        .\setup.ps1

    Se o PowerShell bloquear a execucao, primeiro:
        Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#>

[CmdletBinding()]
param(
    [switch]$NoStart  # se passares -NoStart, nao pergunta para arrancar a app no fim
)

$ErrorActionPreference = 'Stop'

# ------------------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------------------

function Write-Header($text) {
    Write-Host ""
    Write-Host "==> $text" -ForegroundColor Cyan
}

function Write-Ok($text) {
    Write-Host "[OK]   $text" -ForegroundColor Green
}

function Write-Info($text) {
    Write-Host "[info] $text" -ForegroundColor Gray
}

function Write-Warn($text) {
    Write-Host "[!]    $text" -ForegroundColor Yellow
}

function Write-Err($text) {
    Write-Host "[erro] $text" -ForegroundColor Red
}

function Test-CommandExists($cmd) {
    return [bool](Get-Command $cmd -ErrorAction SilentlyContinue)
}

function Get-NodeMajorVersion {
    try {
        $raw = (node --version) 2>$null
        if ($raw -match 'v(\d+)\.') { return [int]$Matches[1] }
    } catch {}
    return 0
}

# ------------------------------------------------------------------------------
# Banner
# ------------------------------------------------------------------------------

Clear-Host
Write-Host "+--------------------------------------------------+" -ForegroundColor Cyan
Write-Host "|             Focus Engine - Instalacao            |" -ForegroundColor Cyan
Write-Host "+--------------------------------------------------+" -ForegroundColor Cyan

# ------------------------------------------------------------------------------
# 1. Verificar pasta
# ------------------------------------------------------------------------------

Write-Header "A verificar a pasta de trabalho"

if (-not (Test-Path -Path ".\package.json")) {
    Write-Err "Nao encontrei 'package.json'. Tens de correr este script a partir da pasta da Focus Engine."
    Write-Info "Pasta actual: $(Get-Location)"
    exit 1
}

$pkg = Get-Content -Path ".\package.json" -Raw | ConvertFrom-Json
if ($pkg.name -ne "focus-engine") {
    Write-Warn "O package.json nao parece ser o da Focus Engine (nome encontrado: '$($pkg.name)'). Vou continuar na mesma."
} else {
    Write-Ok "Pasta correcta (focus-engine v$($pkg.version))."
}

# ------------------------------------------------------------------------------
# 2. Verificar Node.js
# ------------------------------------------------------------------------------

Write-Header "A verificar Node.js"

if (-not (Test-CommandExists "node")) {
    Write-Err "Node.js nao esta instalado (ou nao esta no PATH)."
    Write-Info "Instala-o de: https://nodejs.org/  (escolhe a versao LTS)"
    Write-Info "Depois reinicia o PowerShell e corre .\setup.ps1 outra vez."
    exit 1
}

$nodeMajor = Get-NodeMajorVersion
$nodeFull = (node --version).Trim()
Write-Info "Versao detectada: $nodeFull"

if ($nodeMajor -lt 20) {
    Write-Err "Precisas de Node.js 20 ou superior (tens $nodeFull)."
    Write-Info "Actualiza em: https://nodejs.org/"
    exit 1
}

if (-not (Test-CommandExists "npm")) {
    Write-Err "Nao encontrei 'npm'. Reinstala o Node.js a partir de https://nodejs.org/"
    exit 1
}

Write-Ok "Node.js $nodeFull e npm disponiveis."

# ------------------------------------------------------------------------------
# 3. Instalar dependencias
# ------------------------------------------------------------------------------

Write-Header "A instalar dependencias (npm install)"
Write-Info "Isto pode demorar alguns minutos. Tem paciencia."

npm install
if ($LASTEXITCODE -ne 0) {
    Write-Err "npm install falhou. Ve a mensagem acima."
    exit 1
}
Write-Ok "Dependencias instaladas."

# ------------------------------------------------------------------------------
# 4. Gerar o Prisma Client
# ------------------------------------------------------------------------------

Write-Header "A gerar o Prisma Client"
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Err "prisma generate falhou."
    exit 1
}
Write-Ok "Prisma Client gerado."

# ------------------------------------------------------------------------------
# 5. Aplicar migracoes (cria/actualiza a base de dados SQLite)
# ------------------------------------------------------------------------------

Write-Header "A preparar a base de dados"

$dbPath = Join-Path -Path (Get-Location) -ChildPath "prisma\dev.db"
$dbExisted = Test-Path -Path $dbPath

npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) {
    Write-Err "prisma migrate deploy falhou."
    Write-Info "Se o teu ficheiro de base de dados estiver corrompido, podes apaga-lo (prisma\dev.db) e correr o setup outra vez."
    exit 1
}

if ($dbExisted) {
    Write-Ok "Migracoes aplicadas (base de dados existente preservada)."
} else {
    Write-Ok "Base de dados criada em 'prisma\dev.db'."
}

# ------------------------------------------------------------------------------
# 6. Sucesso
# ------------------------------------------------------------------------------

Write-Host ""
Write-Host "+--------------------------------------------------+" -ForegroundColor Green
Write-Host "|        Instalacao concluida com sucesso!         |" -ForegroundColor Green
Write-Host "+--------------------------------------------------+" -ForegroundColor Green
Write-Host ""
Write-Host "Para arrancar a app a qualquer altura:" -ForegroundColor White
Write-Host "    npm run dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "Depois abre no browser:" -ForegroundColor White
Write-Host "    http://localhost:3210" -ForegroundColor Yellow
Write-Host ""
Write-Host "Para ligar ao Google Calendar (opcional):" -ForegroundColor White
Write-Host "    abre /settings na app e segue as instrucoes." -ForegroundColor Gray
Write-Host ""

# ------------------------------------------------------------------------------
# 7. Arrancar?
# ------------------------------------------------------------------------------

if ($NoStart) { exit 0 }

$answer = Read-Host "Queres arrancar a app agora? (S/N)"
if ($answer -match '^[SsYy]') {
    Write-Header "A arrancar a Focus Engine (Ctrl+C para parar)"
    Write-Info "Abre o browser em http://localhost:3210"
    Write-Host ""
    npm run dev
} else {
    Write-Info "OK. Quando quiseres arrancar, corre 'npm run dev' nesta pasta."
}
