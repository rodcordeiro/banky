# Envia 20 frases de teste para POST /api/v1/nlp e grava scripts/output.json
# Contas: Santander, nubank digo, nubank yah, credito digo, credito yah, mercado pago
# Uso:
#   .\scripts\send-nlp-test-phrases.ps1 -Username 'seu@email' -Password 'segredo'
#   .\scripts\send-nlp-test-phrases.ps1 -AccessToken 'eyJ...'

param(
  [string]$BaseUrl = 'http://localhost:3333',
  [string]$Username,
  [string]$Password,
  [string]$AccessToken,
  [string]$OutputPath = (Join-Path $PSScriptRoot 'output.json')
)

$ErrorActionPreference = 'Stop'
$nlpUrl = "$BaseUrl/api/v1/nlp"

function Normalize-Text([string]$Value) {
  if ($null -eq $Value -or $Value -eq '') { return '' }
  $normalized = $Value.Normalize([Text.NormalizationForm]::FormD)
  $chars = foreach ($ch in $normalized.ToCharArray()) {
    if ([Globalization.CharUnicodeInfo]::GetUnicodeCategory($ch) -ne
      [Globalization.UnicodeCategory]::NonSpacingMark) { $ch }
  }
  -join $chars |
    ForEach-Object { $_.ToLowerInvariant().Trim() }
}

function Same-Value($Left, $Right) {
  if ($null -eq $Left -and $null -eq $Right) { return $true }
  if ($null -eq $Left -or $null -eq $Right) { return $false }

  if ($Left -is [double] -or $Left -is [decimal] -or $Left -is [int] -or
    $Right -is [double] -or $Right -is [decimal] -or $Right -is [int]) {
    return [math]::Abs(([double]$Left) - ([double]$Right)) -lt 0.001
  }

  return (Normalize-Text ([string]$Left)) -eq (Normalize-Text ([string]$Right))
}

function Build-ReviewFromExpected {
  param(
    [object]$Predicted,
    [hashtable]$Expected
  )

  $review = [ordered]@{}
  $hasCorrection = $false

  if ($Expected.ContainsKey('intent') -and -not (Same-Value $Predicted.intent $Expected.intent)) {
    $review.correctedIntent = $Expected.intent
    $hasCorrection = $true
  }

  if ($Expected.ContainsKey('account') -and -not (Same-Value $Predicted.account $Expected.account)) {
    $review.correctedAccount = $Expected.account
    $hasCorrection = $true
  }

  if ($Expected.ContainsKey('originAccount') -and
    -not (Same-Value $Predicted.originAccount $Expected.originAccount)) {
    $review.correctedOriginAccount = $Expected.originAccount
    $hasCorrection = $true
  }

  if ($Expected.ContainsKey('destinyAccount') -and
    -not (Same-Value $Predicted.destinyAccount $Expected.destinyAccount)) {
    $review.correctedDestinyAccount = $Expected.destinyAccount
    $hasCorrection = $true
  }

  if ($Expected.ContainsKey('category') -and -not (Same-Value $Predicted.category $Expected.category)) {
    $review.correctedCategory = $Expected.category
    $hasCorrection = $true
  }

  if ($Expected.ContainsKey('value') -and -not (Same-Value $Predicted.value $Expected.value)) {
    $review.correctedValue = $Expected.value
    $hasCorrection = $true
  }

  if ($hasCorrection) {
    $review.status = 'corrected'
  }
  else {
    $review.status = 'validated'
  }

  if ($Expected.ContainsKey('note')) {
    $review.note = $Expected.note
  }

  return $review
}

# expected.account / origin / destiny usam nomes canonicos do owner
$cases = @(
  @{
    text     = '13.69 de smartbreak na conta nubank digo dia 08/08'
    expected = @{
      intent   = 'create'
      account  = 'nubank digo'
      category = 'Smartbreak'
      value    = 13.69
    }
  }
  @{
    text     = 'Na conta Santander, dia 08/08, 4.95 de uber'
    expected = @{
      intent   = 'create'
      account  = 'Santander'
      category = 'Uber'
      value    = 4.95
    }
  }
  @{
    text     = 'Na conta mercado pago, dia 08/08, 30 de recarga do bilhete unico'
    expected = @{
      intent   = 'create'
      account  = 'Mercado Pago'
      category = 'Bilhete único'
      value    = 30
    }
  }
  @{
    text     = 'Na conta nubank yah, dia 08/08, 89.90 de youtube premium'
    expected = @{
      intent   = 'create'
      account  = 'nubank yah'
      category = 'Serviços de streaming'
      value    = 89.9
    }
  }
  @{
    text     = 'Paguei 58.40 de farmacia na conta credito digo dia 08/08/2026'
    expected = @{
      intent   = 'create'
      account  = 'Crédito digo'
      category = 'Farmácia'
      value    = 58.4
    }
  }
  @{
    text     = 'Na conta credito yah, dia 08/08, 191.54 do assai'
    expected = @{
      intent   = 'create'
      account  = 'Crédito yah'
      category = 'Mercado'
      value    = 191.54
      note     = 'Ajuste categoria se o catalogo usar outro nome para Assai.'
    }
  }
  @{
    text     = 'Na conta Mercado Pago, dia 08/08, 42.50 de almoco'
    expected = @{
      intent   = 'create'
      account  = 'Mercado Pago'
      category = 'Almoço'
      value    = 42.5
    }
  }
  @{
    text     = 'Na conta Santander, dia 08/08, 120 de aluguel'
    expected = @{
      intent   = 'create'
      account  = 'Santander'
      category = 'Aluguel'
      value    = 120
    }
  }
  @{
    text     = 'Na conta nubank digo, dia 08/08, 18.75 de cafe no smartbreak'
    expected = @{
      intent   = 'create'
      account  = 'nubank digo'
      category = 'Smartbreak'
      value    = 18.75
    }
  }
  @{
    text     = 'Caiu 50 de cashback na conta nubank yah no dia 08/08/2026'
    expected = @{
      intent  = 'create'
      account = 'nubank yah'
      value   = 50
      note    = 'Categoria de cashback: valide no catalogo se necessario.'
    }
  }
  @{
    text     = 'Na conta credito digo, dia 08/08, 67.00 de presente'
    expected = @{
      intent  = 'create'
      account = 'Crédito digo'
      value   = 67
    }
  }
  @{
    text     = 'Paguei 39.99 de streaming na conta credito yah dia 08/08/2026'
    expected = @{
      intent   = 'create'
      account  = 'Crédito yah'
      category = 'Serviços de streaming'
      value    = 39.99
    }
  }
  @{
    text     = 'Na conta Mercado Pago, dia 08/08, 155.92 de parcela de emprestimo'
    expected = @{
      intent   = 'create'
      account  = 'Mercado Pago'
      category = 'Parcela de Empréstimo'
      value    = 155.92
    }
  }
  @{
    text     = 'Na conta Santander, dia 08/08, 25.00 de internet'
    expected = @{
      intent   = 'create'
      account  = 'Santander'
      category = 'Serviço de Internet'
      value    = 25
    }
  }
  @{
    text     = 'Na conta nubank digo, dia 08/08, transferi 100 para o nubank yah'
    expected = @{
      intent         = 'transfer'
      originAccount  = 'nubank digo'
      destinyAccount = 'nubank yah'
      value          = 100
    }
  }
  @{
    text     = 'Na conta Santander, dia 08/08, transferi 200 para o mercado pago'
    expected = @{
      intent         = 'transfer'
      originAccount  = 'Santander'
      destinyAccount = 'Mercado Pago'
      value          = 200
    }
  }
  @{
    text     = 'Na conta credito digo, dia 08/08, transferi 80 para o credito yah'
    expected = @{
      intent         = 'transfer'
      originAccount  = 'Crédito digo'
      destinyAccount = 'Crédito yah'
      value          = 80
    }
  }
  @{
    text     = 'Transferi 50 da conta nubank yah para Santander dia 08/08/2026'
    expected = @{
      intent         = 'transfer'
      originAccount  = 'nubank yah'
      destinyAccount = 'Santander'
      value          = 50
    }
  }
  @{
    text     = 'Na conta mercado pago, dia 08/08, transferi 150 para o nubank digo'
    expected = @{
      intent         = 'transfer'
      originAccount  = 'Mercado Pago'
      destinyAccount = 'nubank digo'
      value          = 150
    }
  }
  @{
    text     = 'Transferi 300 da conta credito yah para credito digo dia 08/08/2026'
    expected = @{
      intent         = 'transfer'
      originAccount  = 'Crédito yah'
      destinyAccount = 'Crédito digo'
      value          = 300
    }
  }
)

if (-not $AccessToken) {
  if (-not $Username -or -not $Password) {
    throw 'Informe -AccessToken ou o par -Username/-Password.'
  }

  $login = Invoke-RestMethod `
    -Method Post `
    -Uri "$BaseUrl/api/v1/auth/login" `
    -ContentType 'application/json; charset=utf-8' `
    -Body ([System.Text.Encoding]::UTF8.GetBytes((@{ username = $Username; password = $Password } | ConvertTo-Json)))

  $AccessToken = $login.accessToken
  if (-not $AccessToken) {
    throw 'Login ok, mas accessToken nao veio na resposta.'
  }
}

$headers = @{ Authorization = "Bearer $AccessToken" }

$items = @()
$i = 0

foreach ($case in $cases) {
  $i++
  $text = $case.text
  Write-Host "`n[$i/$($cases.Count)] $text" -ForegroundColor Cyan

  try {
    $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes((@{ text = $text } | ConvertTo-Json))
    $result = Invoke-RestMethod `
      -Method Post `
      -Uri $nlpUrl `
      -Headers $headers `
      -ContentType 'application/json; charset=utf-8' `
      -Body $bodyBytes

    $predicted = [ordered]@{
      intent         = $result.predictedIntent
      account        = $result.predictedAccount
      originAccount  = $result.predictedOriginAccount
      destinyAccount = $result.predictedDestinyAccount
      category       = $result.predictedCategory
      value          = $result.predictedValue
      date           = $result.predictedDate
      status         = $result.status
    }

    $review = Build-ReviewFromExpected -Predicted $predicted -Expected $case.expected

    $item = [ordered]@{
      id           = $result.id
      originalText = $result.originalText
      expected     = $case.expected
      predicted    = $predicted
      review       = $review
    }

    $items += $item
    $item | ConvertTo-Json -Depth 6 | Write-Host
  }
  catch {
    Write-Host "ERRO: $($_.Exception.Message)" -ForegroundColor Red
    $items += [ordered]@{
      id           = $null
      originalText = $text
      expected     = $case.expected
      error        = $_.Exception.Message
      review       = $null
    }
  }
}

$output = [ordered]@{
  generatedAt = (Get-Date).ToString('o')
  baseUrl     = $BaseUrl
  accounts    = @(
    'Santander'
    'nubank digo'
    'nubank yah'
    'Crédito digo'
    'Crédito yah'
    'Mercado Pago'
  )
  count       = @($items | Where-Object { $_.id }).Count
  items       = $items
}

$json = $output | ConvertTo-Json -Depth 8
[System.IO.File]::WriteAllText(
  $OutputPath,
  $json,
  [System.Text.UTF8Encoding]::new($false)
)

Write-Host "`nSalvo em: $OutputPath ($($output.count) itens)" -ForegroundColor Green
Write-Host 'Revise items[].review se o nome canonico da conta no banco divergir e rode send-nlp-review-corrections.ps1' -ForegroundColor Yellow
