# LA BATERIA DEL DOMINO (piso 9 de la plantilla de la casa) - un solo comando.
#
# Copiada del truco (scripts/dev-local/bateria.ps1) y adaptada: banco propio y
# aislado (servidor 4100 con su base data-bateria.db, pantalla 5174), las
# pruebas del motor y del servidor, las de punta a punta contra el servidor
# (chat, retos) y las de navegador de verdad (Chrome a 375 px). Antes de
# pushear algo que toque al jugador o a las mesas, se corre esto y tiene que
# salir VERDE.
#
#   powershell -ExecutionPolicy Bypass -File scripts/bateria.ps1
#
# Opciones:
#   -SinUnitarios  se salta motor y servidor
#   -SinNavegador  se salta Chrome (antesala, mesa, sin conexion, revancha...)
#   -Reusar        no borra la base de la bateria
#   -Solo <etapa>  corre una sola: motor servidor chat retos calentar antesala casa fantasma
#                  reglas sinconexion revancha fotos partida buzon chatmesa socio reportar pam cuentas
#
# NOTA: mantener este archivo ASCII-only (PowerShell 5.1 lee ps1 sin BOM como ANSI).
param(
  [switch]$SinUnitarios,
  [switch]$SinNavegador,
  [switch]$Reusar,
  [string]$Solo = ""
)

$ErrorActionPreference = "Continue"
$repo = (Resolve-Path "$PSScriptRoot\..").Path
$backend = Join-Path $repo "backend"
$frontend = Join-Path $repo "frontend"
$engine = Join-Path $repo "packages\domino-engine"
$reportes = Join-Path $PSScriptRoot "reportes"
New-Item -ItemType Directory -Force -Path $reportes | Out-Null

$API_PORT = 4100
$FRONT_PORT = 5174
$API = "http://127.0.0.1:$API_PORT"
$FRONT = "http://127.0.0.1:$FRONT_PORT"
$BASE = Join-Path $backend "data-bateria.db"

$env:BATERIA_API = $API
$env:BATERIA_FRONT = $FRONT
$env:DOMINO_OUT = Join-Path $reportes "fotos"
New-Item -ItemType Directory -Force -Path $env:DOMINO_OUT | Out-Null

$resultados = @()
function Etapa($nombre, $bloque) {
  if ($Solo -ne "" -and $Solo -ne $nombre) { return }
  Write-Host ""
  Write-Host "=== $nombre ===" -ForegroundColor Cyan
  $inicio = Get-Date
  $ok = $false
  try { $ok = & $bloque } catch { Write-Host "  se rompio: $_" -ForegroundColor Red; $ok = $false }
  $seg = [int]((Get-Date) - $inicio).TotalSeconds
  $script:resultados += [pscustomobject]@{ etapa = $nombre; ok = [bool]$ok; segundos = $seg }
  if ($ok) { Write-Host "  VERDE ($seg s)" -ForegroundColor Green } else { Write-Host "  ROJO ($seg s)" -ForegroundColor Red }
}

function Correr($dir, $cmd, $argumentos, $log) {
  $p = Start-Process -FilePath $cmd -ArgumentList $argumentos -WorkingDirectory $dir -NoNewWindow -PassThru -Wait -RedirectStandardOutput $log -RedirectStandardError "$log.err"
  Get-Content $log | Select-Object -Last 12 | ForEach-Object { Write-Host "  $_" }
  return ($p.ExitCode -eq 0)
}

function Matar($puerto) {
  Get-NetTCPConnection -LocalPort $puerto -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
  }
}

function Esperar($url, $seg) {
  for ($i = 0; $i -lt ($seg * 2); $i++) {
    try { $r = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 2; if ($r.StatusCode -eq 200) { return $true } } catch { $ultimo = "$_" }
    Start-Sleep -Milliseconds 500
  }
  Write-Host "  sin respuesta de $url : $ultimo" -ForegroundColor Red
  return $false
}

# ---------------------------------------------------------------- unitarios
if (-not $SinUnitarios) {
  Etapa "motor" { Correr $engine "node" @("--test") (Join-Path $reportes "motor.log") }
  Etapa "servidor" {
    $env:BOT_DELAY_MS = "0"
    $r = Correr $backend "node" @("src/game/test.js") (Join-Path $reportes "servidor.log")
    Remove-Item Env:BOT_DELAY_MS -ErrorAction SilentlyContinue
    return $r
  }
}

# ---------------------------------------------------------------- el banco
Matar $API_PORT
Matar $FRONT_PORT
if (-not $Reusar) { Remove-Item -Force -ErrorAction SilentlyContinue $BASE, "$BASE-wal", "$BASE-shm" }

$envApi = @{ PORT = "$API_PORT"; DATABASE_PATH = $BASE; CLIENT_URL = $FRONT; DOMINO_SOCIOS = "SocioDePrueba"; DOMINO_BUZON_LLAVE = "llave-de-prueba"; NODE_ENV = "development" }
foreach ($k in $envApi.Keys) { Set-Item -Path "Env:$k" -Value $envApi[$k] }
$procApi = Start-Process -FilePath "node" -ArgumentList @("src/server.js") -WorkingDirectory $backend -NoNewWindow -PassThru -RedirectStandardOutput (Join-Path $reportes "api.log") -RedirectStandardError (Join-Path $reportes "api.err.log")
if (-not (Esperar "$API/api/health" 30)) { Write-Host "El servidor de la bateria no levanto (ver reportes/api.err.log)" -ForegroundColor Red; Stop-Process -Id $procApi.Id -Force; exit 1 }
Write-Host "Servidor de la bateria en $API" -ForegroundColor DarkGray

$procFront = $null
if (-not $SinNavegador) {
  $env:VITE_API_URL = $API
  $procFront = Start-Process -FilePath "npx.cmd" -ArgumentList @("vite", "--host", "127.0.0.1", "--port", "$FRONT_PORT", "--strictPort") -WorkingDirectory $frontend -NoNewWindow -PassThru -RedirectStandardOutput (Join-Path $reportes "front.log") -RedirectStandardError (Join-Path $reportes "front.err.log")
  if (-not (Esperar "$FRONT/" 60)) { Write-Host "La pantalla de la bateria no levanto (ver reportes/front.err.log)" -ForegroundColor Red; Stop-Process -Id $procApi.Id -Force; exit 1 }
  Write-Host "Pantalla de la bateria en $FRONT" -ForegroundColor DarkGray

  # Dos cuentas para las pruebas que las necesitan (fotos de la mesa, sin conexion).
  # Son del banco de pruebas, no del juego: el jugador no se registra en ninguna parte.
  $cuentas = @(@{ u = "bateria170"; p = "Bateria170!"; e = "bateria170@prueba.local" }, @{ u = "bateria171"; p = "Bateria171!"; e = "bateria171@prueba.local" })
  $i = 0
  foreach ($c in $cuentas) {
    $i++
    try { Invoke-RestMethod -Method Post -Uri "$API/api/auth/register" -ContentType "application/json" -Body (@{ username = $c.u; email = $c.e; password = $c.p } | ConvertTo-Json) | Out-Null } catch {}
    $login = Invoke-RestMethod -Method Post -Uri "$API/api/auth/login" -ContentType "application/json" -Body (@{ username = $c.u; password = $c.p } | ConvertTo-Json)
    $sufijo = if ($i -eq 1) { "" } else { "2" }
    Set-Item -Path "Env:DOMINO_TOKEN$sufijo" -Value $login.token
    Set-Item -Path "Env:DOMINO_USER$sufijo" -Value ($login.user | ConvertTo-Json -Compress)
  }
}

# ---------------------------------------------------------------- contra el servidor
Etapa "chat" { Correr $backend "node" @("src/test-chat.js") (Join-Path $reportes "chat.log") }
Etapa "cuentas" { Correr $backend "node" @("src/test-pam.js") (Join-Path $reportes "cuentas.log") }
Etapa "retos" { Correr $backend "node" @("src/test-retos.js") (Join-Path $reportes "retos.log") }

# ---------------------------------------------------------------- navegador
if (-not $SinNavegador) {
  $bat = Join-Path $frontend "scripts\bateria"
  Etapa "calentar" { Correr $frontend "node" @("scripts/bateria/calentar.mjs") (Join-Path $reportes "calentar.log") }
  Etapa "antesala" { Correr $frontend "node" @("scripts/bateria/antesala.mjs") (Join-Path $reportes "antesala.log") }
  Etapa "casa" { Correr $frontend "node" @("scripts/bateria/antesala-casa.mjs") (Join-Path $reportes "casa.log") }
  Etapa "fantasma" { Correr $frontend "node" @("scripts/bateria/antesala-fantasma.mjs") (Join-Path $reportes "fantasma.log") }
  Etapa "reglas" { Correr $frontend "node" @("scripts/bateria/reglas-de-la-mesa.mjs") (Join-Path $reportes "reglas.log") }
  Etapa "sinconexion" { Correr $frontend "node" @("scripts/bateria/sin-conexion.mjs") (Join-Path $reportes "sinconexion.log") }
  Etapa "revancha" { Correr $frontend "node" @("scripts/bateria/revancha.mjs") (Join-Path $reportes "revancha.log") }
  Etapa "fotos" { Correr $frontend "node" @("scripts/bateria/fotos-mesa.mjs") (Join-Path $reportes "fotos.log") }
  Etapa "partida" { Correr $frontend "node" @("scripts/bateria/partida-entera.mjs") (Join-Path $reportes "partida.log") }
  Etapa "buzon" { Correr $frontend "node" @("scripts/bateria/buzon.mjs") (Join-Path $reportes "buzon.log") }
  Etapa "chatmesa" { Correr $frontend "node" @("scripts/bateria/chat-mesa.mjs") (Join-Path $reportes "chatmesa.log") }
  Etapa "socio" { Correr $frontend "node" @("scripts/bateria/socio.mjs") (Join-Path $reportes "socio.log") }
  Etapa "reportar" { Correr $frontend "node" @("scripts/bateria/reportar.mjs") (Join-Path $reportes "reportar.log") }
  Etapa "pam" { Correr $frontend "node" @("scripts/bateria/pam.mjs") (Join-Path $reportes "pam.log") }
}

# ---------------------------------------------------------------- cierre
if ($procFront) { Stop-Process -Id $procFront.Id -Force -ErrorAction SilentlyContinue }
Matar $FRONT_PORT
Stop-Process -Id $procApi.Id -Force -ErrorAction SilentlyContinue
Matar $API_PORT

Write-Host ""
Write-Host "================ LA BATERIA ================" -ForegroundColor Cyan
$rojos = 0
foreach ($r in $resultados) {
  $color = if ($r.ok) { "Green" } else { "Red"; }
  if (-not $r.ok) { $rojos++ }
  $marca = if ($r.ok) { "VERDE" } else { "ROJO " }
  Write-Host ("  {0}  {1,-12} {2,4} s" -f $marca, $r.etapa, $r.segundos) -ForegroundColor $color
}
if ($rojos -gt 0) { Write-Host "$rojos en rojo. No se pushea." -ForegroundColor Red; exit 1 }
Write-Host "Todo verde." -ForegroundColor Green
exit 0
