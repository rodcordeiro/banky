# Envia reviews (validated|corrected) a partir de scripts/output.json (20 frases)
# Contas esperadas: Santander, nubank digo, nubank yah, Crédito digo, Crédito yah, Mercado Pago
# Uso:
#   1) Rode send-nlp-test-phrases.ps1
#   2) Ajuste items[].review no output.json se o nome canonico no banco divergir
#   3) .\scripts\send-nlp-review-corrections.ps1 -Username '...' -Password '...'
#   4) Ou: .\scripts\send-nlp-review-corrections.ps1 -AccessToken 'eyJ...'
#
# Flags:
#   -OnlyStatus corrected   # envia so correcoes
#   -DryRun                 # nao chama a API, so mostra o payload

param(
  [string]$BaseUrl = 'http://localhost:3333',
  [string]$Username,
  [string]$Password,
  [string]$AccessToken,
  [string]$InputPath = (Join-Path $PSScriptRoot 'output.json'),
  [ValidateSet('all', 'validated', 'corrected')]
  [string]$OnlyStatus = 'all',
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $InputPath)) {
  throw "Arquivo nao encontrado: $InputPath"
}

$raw = [System.IO.File]::ReadAllText($InputPath, [System.Text.UTF8Encoding]::new($false))
$data = $raw | ConvertFrom-Json

if (-not $data.items -or @($data.items).Count -eq 0) {
  throw 'output.json sem items.'
}

if ($data.baseUrl) {
  $BaseUrl = [string]$data.baseUrl
}

if (-not $AccessToken) {
  if (-not $Username -or -not $Password) {
    throw 'Informe -AccessToken ou o par -Username/-Password.'
  }

  $loginBody = @{ username = $Username; password = $Password } | ConvertTo-Json
  $login = Invoke-RestMethod `
    -Method Post `
    -Uri "$BaseUrl/api/v1/auth/login" `
    -ContentType 'application/json; charset=utf-8' `
    -Body ([System.Text.Encoding]::UTF8.GetBytes($loginBody))

  $AccessToken = $login.accessToken
  if (-not $AccessToken) {
    throw 'Login ok, mas accessToken nao veio na resposta.'
  }
}

$headers = @{ Authorization = "Bearer $AccessToken" }

function Build-ReviewPayload {
  param([object]$Review)

  $status = [string]$Review.status
  if ($status -notin @('validated', 'corrected')) {
    return $null
  }

  $payload = [ordered]@{ status = $status }

  foreach ($field in @(
      'correctedIntent',
      'correctedAccount',
      'correctedOriginAccount',
      'correctedDestinyAccount',
      'correctedCategory',
      'correctedValue',
      'correctedDate'
    )) {
    $value = $Review.$field
    if ($null -ne $value -and "$value" -ne '') {
      $payload[$field] = $value
    }
  }

  if ($status -eq 'corrected' -and $payload.Count -eq 1) {
    throw "Item exige ao menos um campo corrected* quando status=corrected."
  }

  return $payload
}

$sent = 0
$skipped = 0
$errors = 0
$results = @()

foreach ($item in @($data.items)) {
  if (-not $item.id -or -not $item.review) {
    $skipped++
    continue
  }

  $status = [string]$item.review.status
  if ($OnlyStatus -ne 'all' -and $status -ne $OnlyStatus) {
    $skipped++
    continue
  }

  if ($status -notin @('validated', 'corrected')) {
    Write-Host "SKIP $($item.id) status='$status'" -ForegroundColor DarkYellow
    $skipped++
    continue
  }

  try {
    $payload = Build-ReviewPayload -Review $item.review
    if (-not $payload) {
      $skipped++
      continue
    }

    $uri = "$BaseUrl/api/v1/nlp/$($item.id)/review"
    Write-Host "`n[$status] $($item.originalText)" -ForegroundColor Cyan
    Write-Host "POST $uri" -ForegroundColor DarkGray
    Write-Host ($payload | ConvertTo-Json -Compress)

    if ($DryRun) {
      $skipped++
      continue
    }

    $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes(($payload | ConvertTo-Json))
    $response = Invoke-RestMethod `
      -Method Post `
      -Uri $uri `
      -Headers $headers `
      -ContentType 'application/json; charset=utf-8' `
      -Body $bodyBytes

    $sent++
    $results += [ordered]@{
      id           = $item.id
      originalText = $item.originalText
      sentStatus   = $status
      resultStatus = $response.status
      ok           = $true
    }
  }
  catch {
    $errors++
    Write-Host "ERRO $($item.id): $($_.Exception.Message)" -ForegroundColor Red
    $results += [ordered]@{
      id           = $item.id
      originalText = $item.originalText
      sentStatus   = $status
      ok           = $false
      error        = $_.Exception.Message
    }
  }
}

$summaryPath = Join-Path $PSScriptRoot 'review-result.json'
$summary = [ordered]@{
  generatedAt = (Get-Date).ToString('o')
  inputPath   = $InputPath
  sent        = $sent
  skipped     = $skipped
  errors      = $errors
  dryRun      = [bool]$DryRun
  results     = $results
}

[System.IO.File]::WriteAllText(
  $summaryPath,
  ($summary | ConvertTo-Json -Depth 8),
  [System.Text.UTF8Encoding]::new($false)
)

Write-Host "`nEnviados=$sent  Ignorados=$skipped  Erros=$errors" -ForegroundColor Green
Write-Host "Resumo: $summaryPath"
