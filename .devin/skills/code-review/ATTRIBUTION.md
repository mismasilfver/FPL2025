# Attribution

The contents of this skill (`SKILL.md` and `reference/`) are adapted from the
[awesome-skills/code-review-skill](https://github.com/awesome-skills/code-review-skill)
repository, which is MIT licensed.

Changes made for this project:

- Trimmed to only the guides relevant to this project's stack: vanilla
  JavaScript (ES modules), Express, `better-sqlite3`, Jest, Playwright.
  Framework-specific guides (React, Vue, Angular, Svelte, TypeScript, Java,
  Python, Go, Rust, PHP, Ruby, C#, Kotlin, Swift, C, C++, Zig, Qt,
  CSS/Less/Sass) and the `scripts/`/`assets/` folders were not imported.
- Adapted `SKILL.md` frontmatter to the Devin CLI skill format
  (`allowed-tools: [read, grep, glob, exec]` instead of
  `[Read, Grep, Glob, Bash, WebFetch]`).
- Added project-specific notes to `SKILL.md` and several reference guides
  pointing at concrete files in this repository (`server/database.js`,
  `js/ui-manager.js`, `js/utils/app-error.js`, etc.).
- Trimmed `common-bugs-checklist.md` to universal/JS/SQL/API/testing sections.

See the upstream repository for the full set of language guides if this
project's stack expands (e.g. adopting TypeScript or a frontend framework).
