<!-- markdownlint-disable MD041 -->
<!--
Title format: Conventional Commits
  feat(scope): add X
  fix(scope): handle Y
  chore(scope): bump Z
  docs(scope): clarify W
-->

## Summary

<!-- 1–3 sentences: what changes and why. The "why" matters more than the "what". -->

## Linked issue

Closes #

## Type of change

- [ ] `feat` — new behaviour
- [ ] `fix` — bug fix
- [ ] `chore` — maintenance / deps / tooling
- [ ] `docs` — documentation only
- [ ] `refactor` — internal change, no behaviour change
- [ ] `test` — tests only

## How to test

<!-- Concrete steps a reviewer can run. Include URLs, commands, or screenshots. -->

1.
2.

## Screenshots / recordings (UI changes)

<!-- Drag images in. Required for any visible UI change. -->

## Risk & rollback

- **Blast radius:** local / single service / cross-service / data migration
- **Rollback plan:** revert this PR / requires data fix / forward-fix only
- **Breaking change?** No / Yes — describe the API/behaviour break and the migration path
- **Performance impact:** None expected / measured (attach numbers) / unknown — needs review

## Checklist

- [ ] Title follows Conventional Commits
- [ ] Linked issue references with `Closes #`
- [ ] Tests added or updated (or reason given for none)
- [ ] Docs updated (README, CLAUDE.md, AGENTS.md, runbooks) if behaviour changed
- [ ] No secrets, tokens, or `.env` files committed
- [ ] CI is green

## Charter notes (if applicable)

<!-- Cite any TRUST_CHARTER section this implements or is governed by. -->
