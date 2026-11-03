# Pulls in Angular's official AI resources so the agents work from current guidance.
# Run from the project root:  pwsh scripts/setup-angular-agents.ps1
#
# Override the docs host if you need a version-specific site, e.g.
#   $env:ANGULAR_DOCS_HOST = 'v21.angular.dev'; pwsh scripts/setup-angular-agents.ps1
param(
  [string]$DocsHost = $(if ($env:ANGULAR_DOCS_HOST) { $env:ANGULAR_DOCS_HOST } else { 'next.angular.dev' })
)

$ErrorActionPreference = 'Stop'
$dest = 'docs/angular'
New-Item -ItemType Directory -Force -Path $dest | Out-Null

Write-Host "==> Downloading Angular best practices from https://$DocsHost"
Invoke-WebRequest -Uri "https://$DocsHost/assets/context/best-practices.md" -OutFile "$dest/best-practices.md"
Write-Host "    wrote $dest/best-practices.md"

Write-Host "==> Installing official Angular skills (angular-developer, angular-new-app)"
if (Get-Command npx -ErrorAction SilentlyContinue) {
  try {
    npx skills add https://github.com/angular/skills
  } catch {
    Write-Host "    skills install failed; run it manually: npx skills add https://github.com/angular/skills"
  }
} else {
  Write-Host "    npx not found; install Node.js, then run: npx skills add https://github.com/angular/skills"
}

# OpenCode reads project skills from .opencode/skills. Some installers write to .claude/skills,
# so copy any missing skill folders across without overwriting the project skills.
$openCodeSkills = '.opencode/skills'
New-Item -ItemType Directory -Force -Path $openCodeSkills | Out-Null
foreach ($source in @('.claude/skills', 'skills')) {
  if (Test-Path $source) {
    Get-ChildItem -Directory $source | ForEach-Object {
      $target = Join-Path $openCodeSkills $_.Name
      if (-not (Test-Path $target)) {
        Copy-Item -Recurse $_.FullName $target
        Write-Host "    copied skill $($_.Name) to $openCodeSkills"
      }
    }
  }
}

Write-Host ""
Write-Host "Done. OpenCode reads project skills from .opencode/skills/ and agents from .opencode/agents/."
Write-Host "The Angular CLI MCP server is configured in opencode.json (OpenCode) and .mcp.json (other tools)."
Write-Host "Note: best-practices.md may describe defaults of a newer Angular version than yours."
Write-Host "      Your project's version is noted in AGENTS.md; keep them in sync."
