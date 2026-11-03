@AGENTS.md
@docs/angular/best-practices.md

## Tool note

OpenCode is the primary agent tool for this repository. The maintained adapters are in
`.opencode/agents/`, the orchestration commands in `.opencode/commands/`, and the project skills in
`.opencode/skills/`. See `docs/AGENT-SETUP.md` for the full layout.

If you are running Claude Code, use `AGENTS.md` and the canonical role files in `docs/agents/`
directly. No `.claude/` adapters are maintained. The Angular CLI MCP server is configured in
`opencode.json` for OpenCode and in `.mcp.json` for tools that read that format.
