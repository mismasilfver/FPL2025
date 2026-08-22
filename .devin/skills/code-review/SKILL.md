---
name: code-review
description: |
  Provides structured, expert-level code review guidance for this project's stack
  (vanilla JavaScript/ES modules, Express, better-sqlite3, Jest, Playwright).
  Covers architecture review (SOLID), universal code quality anti-patterns,
  security review (SQL injection, XSS, general checklist), performance review,
  error handling principles, and async/concurrency patterns.
  Use when: reviewing pull requests, conducting PR reviews, code review, reviewing
  code changes, establishing review standards, mentoring developers, architecture
  reviews, security audits, performance reviews, checking code quality, finding
  bugs, giving feedback on code.
allowed-tools:
  - read
  - grep
  - glob
  - exec
---

# Code Review Skill

Transform code reviews from gatekeeping to knowledge sharing through constructive feedback, systematic analysis, and collaborative improvement.

> Adapted from [awesome-skills/code-review-skill](https://github.com/awesome-skills/code-review-skill) (MIT licensed), trimmed to the guides relevant to this project's stack. The upstream repository has additional language-specific guides (React, Python, Go, Rust, Java, etc.) that can be fetched directly if this project's stack ever expands beyond vanilla JS/Express/SQLite.

## When to Use This Skill

- Reviewing pull requests and code changes
- Establishing code review standards for teams
- Mentoring junior developers through reviews
- Conducting architecture reviews
- Creating review checklists and guidelines
- Improving team collaboration
- Reducing code review cycle time
- Maintaining code quality standards

## Core Principles

### 1. The Review Mindset

**Goals of Code Review:**
- Catch bugs and edge cases
- Ensure code maintainability
- Share knowledge across team
- Enforce coding standards
- Improve design and architecture
- Build team culture

**Not the Goals:**
- Show off knowledge
- Nitpick formatting (use linters)
- Block progress unnecessarily
- Rewrite to your preference

### 2. Effective Feedback

**Good Feedback is:**
- Specific and actionable
- Educational, not judgmental
- Focused on the code, not the person
- Balanced (praise good work too)
- Prioritized (critical vs nice-to-have)

```markdown
❌ Bad: "This is wrong."
✅ Good: "This could cause a race condition when multiple users
         access simultaneously. Consider using a mutex here."

❌ Bad: "Why didn't you use X pattern?"
✅ Good: "Have you considered the Repository pattern? It would
         make this easier to test. Here's an example: [link]"

❌ Bad: "Rename this variable."
✅ Good: "[nit] Consider `userCount` instead of `uc` for
         clarity. Not blocking if you prefer to keep it."
```

### 3. Review Scope

**What to Review:**
- Logic correctness and edge cases
- Security vulnerabilities
- Performance implications
- Test coverage and quality
- Error handling
- Documentation and comments
- API design and naming
- Architectural fit

**What Not to Review Manually:**
- Code formatting (use Prettier, Black, etc.)
- Import organization
- Linting violations
- Simple typos

## Review Process

### Phase 1: Context Gathering (2-3 minutes)

Before diving into code, understand:
1. Read PR description and linked issue
2. Check PR size (>400 lines? Ask to split)
3. Review CI/CD status (tests passing?)
4. Understand the business requirement
5. Note any relevant architectural decisions

### Phase 2: High-Level Review (5-10 minutes)

1. **Architecture & Design** - Does the solution fit the problem?
   - For significant changes, consult [Architecture Review Guide](reference/architecture-review-guide.md)
   - Check: SOLID principles, coupling/cohesion, anti-patterns
2. **Performance Assessment** - Are there performance concerns?
   - For performance-critical code, consult [Performance Review Guide](reference/performance-review-guide.md)
   - Check: Algorithm complexity, N+1 queries, memory usage
3. **File Organization** - Are new files in the right places?
4. **Testing Strategy** - Are there tests covering edge cases?

### Phase 3: Line-by-Line Review (10-20 minutes)

For each file, check:
- **Logic & Correctness** - Edge cases, off-by-one, null checks, race conditions
- **Security** - Input validation, injection risks, XSS, sensitive data
- **Performance** - N+1 queries, unnecessary loops, memory leaks
- **Maintainability** - Clear names, single responsibility, comments
- **Reuse** - Before accepting new code, search for existing utilities/helpers that could replace it. Check adjacent files and shared modules for similar patterns. See [Universal Quality Guide](reference/code-quality-universal.md) for anti-patterns like parameter sprawl, leaky abstractions, nested conditionals, stringly-typed code, TOCTOU, and no-op updates.

### Phase 4: Summary & Decision (2-3 minutes)

1. Summarize key concerns
2. Highlight what you liked
3. Make clear decision:
   - ✅ Approve
   - 💬 Comment (minor suggestions)
   - 🔄 Request Changes (must address)
4. Offer to pair if complex

## Review Techniques

### Technique 1: The Checklist Method

Use checklists for consistent reviews. See [Security Review Guide](reference/security-review-guide.md) for comprehensive security checklist.

### Technique 2: The Question Approach

Instead of stating problems, ask questions:

```markdown
❌ "This will fail if the list is empty."
✅ "What happens if `items` is an empty array?"

❌ "You need error handling here."
✅ "How should this behave if the API call fails?"
```

### Technique 3: Suggest, Don't Command

Use collaborative language:

```markdown
❌ "You must change this to use async/await"
✅ "Suggestion: async/await might make this more readable. What do you think?"

❌ "Extract this into a function"
✅ "This logic appears in 3 places. Would it make sense to extract it?"
```

### Technique 4: Differentiate Severity

Use labels to indicate priority:

- 🔴 `[blocking]` - Must fix before merge
- 🟡 `[important]` - Should fix, discuss if disagree
- 🟢 `[nit]` - Nice to have, not blocking
- 💡 `[suggestion]` - Alternative approach to consider
- 📚 `[learning]` - Educational comment, no action needed
- 🎉 `[praise]` - Good work, keep it up!

**Severity levels:** 🔴 / 🟡 / 🟢 are the three severity tiers used as the standard across all guides in this skill — 🔴 blocks the merge, 🟡 should be addressed, 🟢 is optional. The remaining markers (💡 / 📚 / 🎉) are non-blocking annotations.

## Reference Guides

| Topic | Reference File | Key Topics |
|-------|----------------|------------|
| **Architecture Review** | [Architecture Review Guide](reference/architecture-review-guide.md) | SOLID, anti-patterns, coupling/cohesion, dependency direction |
| **Performance Review** | [Performance Review Guide](reference/performance-review-guide.md) | Algorithm complexity, N+1 queries, memory leaks, caching, async concurrency |
| **Security Review** | [Security Review Guide](reference/security-review-guide.md) | Auth, SQLi, XSS, CSRF, SSRF, IDOR, command injection, secrets |
| **Universal Quality** | [Universal Quality Guide](reference/code-quality-universal.md) | Reuse audit, parameter sprawl, leaky abstractions, nested conditionals, stringly-typed code, TOCTOU, no-op updates, redundant state |
| **Common Bugs** | [Common Bugs Checklist](reference/common-bugs-checklist.md) | Universal logic/resource/error-handling bug patterns, TypeScript/JavaScript-specific pitfalls |
| **Review Best Practices** | [Code Review Best Practices](reference/code-review-best-practices.md) | Communication, reviewer mindset, giving feedback, prioritization |
| **SQL Injection Prevention** | [SQL Injection Guide](reference/cross-cutting/sql-injection-prevention.md) | Parameterized queries, ORM safety, dynamic identifiers, detection — relevant for `server/database.js` (better-sqlite3) |
| **XSS Prevention** | [XSS Prevention Guide](reference/cross-cutting/xss-prevention.md) | Output encoding, CSP, input validation vs encoding, detection — relevant for manual DOM/`innerHTML` construction in `js/ui-manager.js` |
| **Error Handling** | [Error Handling Guide](reference/cross-cutting/error-handling-principles.md) | Fail fast, error hierarchy, anti-patterns, logging — relevant given this project's `AppError`/`error-handler.js` |
| **Async & Concurrency** | [Concurrency Guide](reference/cross-cutting/async-concurrency-patterns.md) | async/await patterns, race conditions, structured concurrency, backpressure |

## Project-Specific Notes

This project (`FPL2025`) is a vanilla JavaScript (ES modules) app with an Express server, `better-sqlite3` for the SQL backend, and Jest/Playwright for testing. There is no TypeScript, no frontend framework (React/Vue/Angular/Svelte), and no Sass/Less. When reviewing:

- Skip framework-specific advice (Hooks, Signals, Composition API, etc.) — none of it applies here.
- Apply the SQL Injection guide's Node.js examples to `server/database.js` and `server/routes/storage.js`.
- Apply the XSS guide's general DOM-manipulation guidance (not the JSX/Vue/Angular specific sections) to `js/ui-manager.js`.
- Apply the Async & Concurrency guide's `async/await` (TypeScript/JavaScript) sections to the storage adapters and services under `js/services/` and `js/storage/`.
- Favor the project's existing `AppError` hierarchy (`js/utils/app-error.js`) and `handleAppError` (`js/utils/error-handler.js`) as the reference implementation when applying the Error Handling guide.
