param([Parameter(Mandatory=$true)][string]$InputPath, [Parameter(Mandatory=$true)][string]$OutputPdf)
$ErrorActionPreference = 'Stop'
$word = $null
$doc = $null
try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0
  $doc = $word.Documents.Open([IO.Path]::GetFullPath($InputPath), $false, $false)
  foreach ($toc in $doc.TablesOfContents) { $toc.Update() }
  $doc.Fields.Update() | Out-Null
  $doc.Repaginate()
  foreach ($toc in $doc.TablesOfContents) { $toc.Update() }
  $doc.Save()
  $doc.ExportAsFixedFormat([IO.Path]::GetFullPath($OutputPdf), 17)
} finally {
  if ($doc) { $doc.Close($false) }
  if ($word) { $word.Quit() }
  if ($doc) { [Runtime.InteropServices.Marshal]::ReleaseComObject($doc) | Out-Null }
  if ($word) { [Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null }
}
