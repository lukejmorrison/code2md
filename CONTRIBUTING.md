# Contributing to Wizwam

This file documents the **universal workflow** used across every Wizwam repo. Every repo under [github.com/Wizwam](https://github.com/orgs/Wizwam/repositories) follows the same flow so contributors — human or AI (Claude Code, GitHub Copilot, OpenAI Codex) — can move between repos without relearning conventions.

## The flow

```
Issue (#123)  →  Branch (feat/123-slug)  →  Commits  →  PR  →  Review  →  Squash-merge  →  Issue auto-closes
```

Three layers, three artefacts:

| Layer | What | Where |
|---|---|---|
| **Intent** | What we want to build / fix | GitHub Issue (uses an issue template) |
| **Work** | The diff in progress | A branch, named after the issue |
| **Delivery** | Proposed change for review | Pull Request (uses the PR template) |

## 1. Open an issue first

Every change starts with an issue. Use the templates:

- **Bug** → `bug_report.md` (title prefix `fix:`)
- **Feature** → `feature_request.md` (title prefix `feat:`)
- **Maintenance** → `chore.md` (title prefix `chore:`)

Only skip the issue for one-line typo fixes.

## 2. Branch naming

```
<type>/<issue-#>-<short-slug>
```

Examples:

- `feat/42-voicedna-export`
- `fix/87-approval-timeout`
- `chore/bump-anthropic-sdk`
- `docs/contributing-flow`

`<type>` matches Conventional Commits: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`.

## 3. Commits — Conventional Commits

```
<type>(<scope>): <imperative summary>

<optional body explaining why>

<optional footer, e.g. Closes #42>
```

Examples:

```
feat(voicedna): add CSV export endpoint
fix(approvals): handle 30s broker timeout
chore(deps): bump @anthropic-ai/sdk to 0.39
docs(readme): clarify install steps
```

Why: GitHub renders these nicely, every modern AI tool understands them, and changelog generators can read them automatically.

## 4. Pull Request

- Use the `PULL_REQUEST_TEMPLATE.md` — it auto-loads.
- PR title = the squash-merge commit message → must follow Conventional Commits.
- Body must include `Closes #<issue>` so the issue auto-closes on merge.
- CI must be green before merge.
- At least one approving review from a CODEOWNER.

## 5. Merging

- **Default:** squash-merge. Keeps `main` history linear and readable.
- **Exception:** long-lived feature branches with meaningful commit history may use a merge commit, by maintainer decision.
- After merge: branch is auto-deleted, issue auto-closes.

## Labels (standard set)

| Label | Meaning |
|---|---|
| `bug` | Something is broken |
| `feature` | New capability |
| `chore` | Maintenance |
| `docs` | Documentation only |
| `triage` | Needs maintainer review |
| `good-first-issue` | Onboarding-friendly |
| `blocked` | Waiting on something external |
| `security` | Security-relevant — handle privately first |

## Working with AI agents

This repo includes both `CLAUDE.md` (Claude Code instructions) and `AGENTS.md` (OpenAI Codex / Copilot instructions). When you ask any agent to make a change, ask it to:

1. Open or reference an issue.
2. Create a branch using the convention above.
3. Use Conventional Commits.
4. Open a PR using the template.

That way the same workflow applies regardless of which tool produced the diff.

## Security

Do **not** open public issues for vulnerabilities. Email `security@wizwam.com`. See `SECURITY.md` for the full policy.

## Governance

Substantial decisions (architecture, data handling, third-party integrations) reference the [Wizwam Trust Charter](https://github.com/Wizwam/charter). Cite the relevant section in the PR description when applicable.
