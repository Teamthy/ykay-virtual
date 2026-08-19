# FIX_MIGRATIONS_B64.ps1
# Repairs the four migration files using base64-decoded content (no patch, no
# conflict markers, no PowerShell variable/heredoc parsing issues).
#
# Run from the repo root:
#   cd C:\Users\USER\Desktop\PROJECTS\ykay-virtual
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\FIX_MIGRATIONS_B64.ps1

$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $MyInvocation.MyCommand.Path)
$dir = "migrations"

function Write-B64([string]$path, [string]$b64) {
    $bytes = [System.Convert]::FromBase64String($b64)
    [System.IO.File]::WriteAllBytes((Join-Path (Get-Location) $path), $bytes)
    Write-Host "Wrote $path" -ForegroundColor Green
}

# 000044_remove_ielts_toefl_pte.up.sql
Write-B64 "$dir\000044_remove_ielts_toefl_pte.up.sql" @'
LS0gMDAwMDQ0IOKAlCBSZW1vdmUgSUVMVFMsIFRPRUZMIGFuZCBQVEUgY2F0YWxvZ3VlIHJvd3MuCi0tCi0tIFRoZXNlIGFyZSByZW1vdmVkIGZyb20gcHJvZHVjdCBzY29wZS4gR01BVCwgR1JFLCBTQVQgYW5kIEFDVCByZW1haW4uCi0tIE9ubHkgcmVmZXJlbmNlcyByZWFsIHRhYmxlczogcHJvZ3JhbW1lX3N1YmplY3RzLCB0dXRvcl9zdWJqZWN0cywKLS0gZXhhbXMsIHN1YmplY3RzLgoKLS0gUmVtb3ZlIHByb2dyYW1tZSBsaW5rcy4KREVMRVRFIEZST00gcHJvZ3JhbW1lX3N1YmplY3RzCldIRVJFIHN1YmplY3RfaWQgSU4gKFNFTEVDVCBpZCBGUk9NIHN1YmplY3RzIFdIRVJFIHNsdWcgSU4gKCdpZWx0cy1wcmVwJywndG9lZmwtcHJlcCcsJ3B0ZS1wcmVwJykpOwoKLS0gUmVtb3ZlIHR1dG9yIGxpbmtzLgpERUxFVEUgRlJPTSB0dXRvcl9zdWJqZWN0cwpXSEVSRSBzdWJqZWN0X2lkIElOIChTRUxFQ1QgaWQgRlJPTSBzdWJqZWN0cyBXSEVSRSBzbHVnIElOICgnaWVsdHMtcHJlcCcsJ3RvZWZsLXByZXAnLCdwdGUtcHJlcCcpKTsKCi0tIFJlbW92ZSBleGFtIHJlY29yZHMuCkRFTEVURSBGUk9NIGV4YW1zIFdIRVJFIHNsdWcgSU4gKCdpZWx0cycsJ3RvZWZsJywncHRlJyk7CgotLSBSZW1vdmUgc3ViamVjdCByZWNvcmRzLgpERUxFVEUgRlJPTSBzdWJqZWN0cyBXSEVSRSBzbHVnIElOICgnaWVsdHMtcHJlcCcsJ3RvZWZsLXByZXAnLCdwdGUtcHJlcCcpOwo=
'@

# 000044_remove_ielts_toefl_pte.down.sql
Write-B64 "$dir\000044_remove_ielts_toefl_pte.down.sql" @'
LS0gMDAwMDQ0IGRvd24g4oCUIHJlLWFkZCBJRUxUUywgVE9FRkwgYW5kIFBURSBjYXRhbG9ndWUgcm93cy4KCklOU0VSVCBJTlRPIGV4YW1zIChuYW1lLCBzbHVnLCBkZXNjcmlwdGlvbikgVkFMVUVTCignSUVMVFMnLCdpZWx0cycsJ0ludGVybmF0aW9uYWwgRW5nbGlzaCBMYW5ndWFnZSBUZXN0aW5nIFN5c3RlbScpLAooJ1RPRUZMJywndG9lZmwnLCdUZXN0IG9mIEVuZ2xpc2ggYXMgRm9yZWlnbiBMYW5ndWFnZScpLAooJ1BURScsJ3B0ZScsJ1BlYXJzb24gVGVzdCBvZiBFbmdsaXNoJykKT04gQ09ORkxJQ1QgKHNsdWcpIERPIE5PVEhJTkc7CgpJTlNFUlQgSU5UTyBzdWJqZWN0cyAobmFtZSwgc2x1ZywgY2F0ZWdvcnkpIFZBTFVFUwooJ0lFTFRTIFByZXAnLCdpZWx0cy1wcmVwJywnRXhhbSBQcmVwYXJhdGlvbicpLAooJ1RPRUZMIFByZXAnLCd0b2VmbC1wcmVwJywnRXhhbSBQcmVwYXJhdGlvbicpLAooJ1BURSBQcmVwJywncHRlLXByZXAnLCdFeGFtIFByZXBhcmF0aW9uJykKT04gQ09ORkxJQ1QgKHNsdWcpIERPIE5PVEhJTkc7Cg==
'@

# 000045_remove_demo_teachers.up.sql
Write-B64 "$dir\000045_remove_demo_teachers.up.sql" @'
LS0gMDAwMDQ1IOKAlCBSZW1vdmUgREVNTyAvIE1BUktFVElORyB0dXRvciBwcm9maWxlcywgdGhlaXIgZGVtbyBwcm9ncmFtbWVzIGFuZAotLSBkZW1vIGNvaG9ydHMsIHNvIE9OTFkgcmVhbCwgYWRtaW4tYXBwcm92ZWQgKHZlcmlmaWVkKSB0dXRvcnMgYXJlIHNob3duIG9uCi0tIHRoZSB0dXRvcnMgcGFnZS4KLS0KLS0gVGhpcyB0YXJnZXRzOgotLSAgICogc2VlZC1wcm9kLWRlbW8uc3FsIGRlbW8gaWRlbnRpdGllcyAoZGVtby10dXRvci0qLCB0dXRvck5AbnV2b3JhLnRlc3QsCi0tICAgICBkZW1vLXByb2dyYW1tZS0qLCBkZW1vLWNvaG9ydC0qKQotLSAgICogMDAwMDQxIG1hcmtldGluZyB0dXRvciBwcm9maWxlcyAodHV0b3IuPG5hbWU+QG51dm9yYS50ZXN0KSB3aGljaCBhcmUKLS0gICAgIEFQUFJPVkVEICsgaXNfcHVibGljIGJ1dCBhcmUgTk9UIHJlYWwgdGVhY2hlcnMuCi0tCi0tIFJlYWwgdHV0b3JzIHdobyByZWdpc3RlciBhbmQgcGFzcyB2ZXR0aW5nIGFyZSB1bmFmZmVjdGVkLgoKRE8gJCQKREVDTEFSRQogIHZfdXNlciB1dWlkOwpCRUdJTgogIC0tIDEuIFJlbW92ZSBkZW1vIGNvaG9ydHMuCiAgREVMRVRFIEZST00gY29ob3J0cyBXSEVSRSBzbHVnIExJS0UgJ2RlbW8tY29ob3J0LSUnOwoKICAtLSAyLiBSZW1vdmUgZGVtbyBwcm9ncmFtbWVzIChjYXNjYWRlcyB0byBjb2hvcnQgbGlua3MgdmlhIE9OIERFTEVURSBDQVNDQURFKS4KICBERUxFVEUgRlJPTSBwcm9ncmFtbWVzIFdIRVJFIHNsdWcgTElLRSAnZGVtby1wcm9ncmFtbWUtJSc7CgogIC0tIDMuIFJlbW92ZSBkZW1vICsgbWFya2V0aW5nIHR1dG9yIHByb2ZpbGVzIGFuZCB0aGVpciB1c2VyIHJvd3MuCiAgRk9SIHZfdXNlciBJTgogICAgU0VMRUNUIHUuaWQgRlJPTSB1c2VycyB1CiAgICBXSEVSRSB1LmVtYWlsIElMSUtFICd0dXRvciVAbnV2b3JhLnRlc3QnCiAgICAgICBPUiB1LmVtYWlsIElMSUtFICd0dXRvci4lQG51dm9yYS50ZXN0JwogIExPT1AKICAgIERFTEVURSBGUk9NIHR1dG9yX3Byb2ZpbGVzIFdIRVJFIHVzZXJfaWQgPSB2X3VzZXI7CiAgICBERUxFVEUgRlJPTSB1c2VyX3JvbGVzIFdIRVJFIHVzZXJfaWQgPSB2X3VzZXI7CiAgICBERUxFVEUgRlJPTSBzZXNzaW9ucyBXSEVSRSB1c2VyX2lkID0gdl91c2VyOwogIEVORCBMT09QOwogIERFTEVURSBGUk9NIHVzZXJzCiAgV0hFUkUgZW1haWwgSUxJS0UgJ3R1dG9yJUBudXZvcmEudGVzdCcKICAgICBPUiBlbWFpbCBJTElLRSAndHV0b3IuJUBudXZvcmEudGVzdCc7CgogIC0tIDQuIEFsc28gcmVtb3ZlIHRoZSBkZW1vIHBhcmVudC9zdHVkZW50IGlkZW50aXRpZXMgKG5vbi1wcm9kdWN0aW9uKS4KICBERUxFVEUgRlJPTSBwYXJlbnRfc3R1ZGVudF9saW5rcyBXSEVSRSBwYXJlbnRfdXNlcl9pZCBJTiAoCiAgICBTRUxFQ1QgaWQgRlJPTSB1c2VycyBXSEVSRSBlbWFpbCBJTiAoJ2RlbW8ucGFyZW50QG51dm9yYS50ZXN0JywnZGVtby5zdHVkZW50QG51dm9yYS50ZXN0JykKICApOwogIERFTEVURSBGUk9NIHVzZXJzIFdIRVJFIGVtYWlsIElOICgnZGVtby5wYXJlbnRAbnV2b3JhLnRlc3QnLCdkZW1vLnN0dWRlbnRAbnV2b3JhLnRlc3QnKTsKRU5EICQkOwo=
'@

# 000045_remove_demo_teachers.down.sql
Write-B64 "$dir\000045_remove_demo_teachers.down.sql" @'
LS0gMDAwMDQ1IGRvd24g4oCUIGJlc3QtZWZmb3J0IG5vdGUuCi0tIFJlLWFkZGluZyB0aGUgZGVtby9tYXJrZXRpbmcgdHV0b3IgZml4dHVyZXMgaXMgaW50ZW50aW9uYWwgKHRoZXkgYXJlIG5vdAotLSBwcm9kdWN0aW9uIGRhdGEpLiBUbyByZXN0b3JlIG1hcmtldGluZyB0dXRvcnMsIHJlLXJ1biBtaWdyYXRpb24gMDAwMDQxLgpTRUxFQ1QgMTsK
'@

# Remove stale old-numbered demo-teachers files if present.
foreach ($old in @("$dir\000044_remove_demo_teachers.up.sql","$dir\000044_remove_demo_teachers.down.sql")) {
    if (Test-Path $old) { Remove-Item $old -Force; Write-Host "Removed stale: $old" -ForegroundColor Yellow }
}

Write-Host ""
Write-Host "==> Verifying no conflict markers remain..." -ForegroundColor Cyan
$markers = Select-String -Path "$dir\000044_*.sql","$dir\000045_*.sql" -Pattern "<<<<<<<|=======|>>>>>>>" -ErrorAction SilentlyContinue
if ($markers) { Write-Host "Conflict markers remain!" -ForegroundColor Red; $markers | ForEach-Object { Write-Host "  $($_.Path):$($_.LineNumber)" }; exit 1 }
else { Write-Host "Clean. No conflict markers." -ForegroundColor Green }

Write-Host ""
Write-Host "==> Verifying versions are unique..." -ForegroundColor Cyan
$ups = Get-ChildItem "$dir\*.up.sql" | ForEach-Object { $_.Name -replace '^0*','' -replace '_up\.sql$','' }
$dups = $ups | Group-Object | Where-Object { $_.Count -gt 1 }
if ($dups) { Write-Host "DUPLICATE versions:" -ForegroundColor Red; $dups | ForEach-Object { Write-Host "  version $($_.Name)" }; exit 1 }
else { Write-Host "All versions unique." -ForegroundColor Green }

Write-Host ""
Write-Host "Now run:  go run ./cmd/migrate --cmd=up" -ForegroundColor Cyan
