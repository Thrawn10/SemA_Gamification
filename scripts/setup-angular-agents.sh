#!/usr/bin/env bash
# Pulls in Angular's official AI resources so the agents work from current guidance.
# Run from the project root:  bash scripts/setup-angular-agents.sh
#
# Override the docs host if you need a version-specific site, e.g.
#   ANGULAR_DOCS_HOST=v21.angular.dev bash scripts/setup-angular-agents.sh
set -euo pipefail

HOST="${ANGULAR_DOCS_HOST:-next.angular.dev}"
DEST="docs/angular"

mkdir -p "$DEST"

echo "==> Downloading Angular best practices from https://$HOST"
curl -fsSL "https://$HOST/assets/context/best-practices.md" -o "$DEST/best-practices.md"
echo "    wrote $DEST/best-practices.md"

echo "==> Installing official Angular skills (angular-developer, angular-new-app)"
if command -v npx >/dev/null 2>&1; then
  npx skills add https://github.com/angular/skills || echo "    skills install failed; run it manually: npx skills add https://github.com/angular/skills"
else
  echo "    npx not found; install Node.js, then run: npx skills add https://github.com/angular/skills"
fi

# OpenCode reads project skills from .opencode/skills. Some installers write to .claude/skills,
# so copy any missing skill folders across without overwriting the project skills.
mkdir -p .opencode/skills
for source in .claude/skills skills; do
  if [ -d "$source" ]; then
    for skill in "$source"/*/; do
      [ -d "$skill" ] || continue
      name="$(basename "$skill")"
      if [ ! -e ".opencode/skills/$name" ]; then
        cp -R "$skill" ".opencode/skills/$name"
        echo "    copied skill $name to .opencode/skills"
      fi
    done
  fi
done

echo
echo "Done. OpenCode reads project skills from .opencode/skills/ and agents from .opencode/agents/."
echo "The Angular CLI MCP server is configured in opencode.json (OpenCode) and .mcp.json (other tools)."
echo "Note: best-practices.md may describe defaults of a newer Angular version than yours."
echo "      Your project's version is noted in AGENTS.md; keep them in sync."
