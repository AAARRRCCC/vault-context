Should the untracked directories (mayor-daemon, mayor-dashboard) be:

Option A: Added as subdirectories of vault-context (single repo, everything in one place)
Option B: Initialized as separate git repos with their own remotes on GitHub
Option C: Left as-is (no git tracking)

Context:
- vault-context is already a public GitHub repo (AAARRRCCC/vault-context)
- mayor-daemon contains the daemon code (Discord bot, MAGI, self-improvement) — sensitive (bot token in .env, system prompts)
- mayor-dashboard contains the dashboard (server.js, index.html) — not sensitive
- foreman-bot is already a local-only git repo (no remote)
- A disk failure would lose all three directories
- vault-context is public, so adding daemon code there exposes system prompts and architecture details
- The old system had foreman-bot and mayor-dashboard both untracked and not backed up

Consider: security (public vs private), backup/recovery, simplicity of management, and whether Brady would want system internals public.