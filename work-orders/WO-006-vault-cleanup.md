---
id: WO-006
status: pending
priority: normal
created: 2026-02-24
mayor: claude-web
---

# Clean Up Vault Root Scaffolding Leftovers

## Objective

Remove claudesidian template scaffolding files that are cluttering the vault root. These were flagged in SYSTEM_STATUS.md during the initial verification (WO-001) as noise files that don't belong in a working Obsidian vault.

## Context

When the vault was bootstrapped with the claudesidian template, it left behind package management and project scaffolding files at the root level. These files serve no purpose in the active vault — they were part of the template's install process and should have been cleaned up after setup.

From SYSTEM_STATUS.md:
> Root has extra noise: `CHANGELOG.md`, `CONTRIBUTING.md`, `install.sh`, `LICENSE`, `node_modules/`, `package.json`, `package-lock.json`, `pnpm-lock.yaml`, `Untitled.canvas`, `Untitled 1.canvas`

## Deliverable: Remove Scaffolding Files

Delete the following from the vault root if they exist:

1. `CHANGELOG.md` — template changelog, not vault content
2. `CONTRIBUTING.md` — template contributing guide, not vault content
3. `install.sh` — template installer script
4. `LICENSE` — template license file (the vault itself doesn't need an OSS license)
5. `node_modules/` — npm dependency directory from template install
6. `package.json` — npm package manifest from template
7. `package-lock.json` — npm lockfile from template
8. `pnpm-lock.yaml` — pnpm lockfile from template
9. `Untitled.canvas` — empty/default Obsidian canvas
10. `Untitled 1.canvas` — empty/default Obsidian canvas

Before deleting, verify each file is actually scaffolding and not something Brady created or needs:
- Check if any of these are referenced by other vault files
- Check if any scripts in `.scripts/` depend on package.json or node_modules
- If `node_modules/` contains dependencies used by vault scripts (like fix-renamed-links.js or update-attachment-links.js), do NOT delete node_modules, package.json, or lockfiles — instead note this in the result

If `.scripts/` JS files require node dependencies, keep package.json and node_modules but still remove the other scaffolding files (CHANGELOG.md, CONTRIBUTING.md, install.sh, LICENSE, canvases).

## Acceptance Criteria

- [ ] Scaffolding files removed (or documented why they were kept)
- [ ] No vault functionality broken — verify Obsidian CLI, scripts, and basic-memory still work
- [ ] Changes committed with a clear commit message
- [ ] SYSTEM_STATUS.md updated to remove the ⚠️ warning about root noise (or update it to reflect what was kept and why)
- [ ] Results written to vault-context/results/WO-006-result.md

## Notes

- Be conservative — if unsure whether something is needed, keep it and note it in the result
- Run `node -e "require('./package.json')"` or check what's in node_modules before deleting
- The canvases (Untitled.canvas, Untitled 1.canvas) are almost certainly empty defaults and safe to remove
- After cleanup, the vault root should only contain PARA folders (00_Inbox through 06_Metadata), CLAUDE.md, .claude/, .scripts/, .obsidian/, and .git/
