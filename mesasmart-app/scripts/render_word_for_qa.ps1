param(
  [Parameter(Mandatory = $true)][string]$InputPath,
  [Parameter(Mandatory = $true)][string]$OutputPdf
)
$ErrorActionPreference = "Stop"
$inputFull = [System.IO.Path]::GetFullPath($InputPath)
$outputFull = [System.IO.Path]::GetFullPath($OutputPdf)
$word = $null
$document = $null
try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0
  $document = $word.Documents.Open($inputFull, $false, $true)
  $document.ExportAsFixedFormat($outputFull, 17)
} finally {
  if ($document) { $document.Close($false) }
  if ($word) { $word.Quit() }
  if ($document) { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($document) | Out-Null }
  if ($word) { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
Write-Output $outputFull
