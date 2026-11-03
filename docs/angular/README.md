# Angular guidance

`best-practices.md` in this folder is downloaded from Angular's official documentation site by
`scripts/setup-angular-agents.ps1` (Windows) or `scripts/setup-angular-agents.sh` (bash). It is
already present in the repository; re-run the script to refresh it. The official
`angular-developer` skill is installed under `.agents/skills/` and tracked by `skills-lock.json`.

The file is added to every OpenCode session through the `instructions` field in `opencode.json`, so
agents see the official guidance without copying it into their role files.

Some rules in it depend on the Angular version. The version this project uses is recorded in
`AGENTS.md` and `package.json` (Angular 22.x; currently 22.2.4 / CLI 22.2.5).

Other official resources used by this setup:

- Angular CLI MCP server, configured in `opencode.json` (`mcp.servers.angular-cli`)
- Skills `angular-developer` and `angular-new-app` from github.com/angular/skills, installed by the
  setup script
