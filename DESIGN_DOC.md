# DESIGN_DOC.md — Automated Marketplace Publish (code2md)

**Date:** 2026-04-23  
**Author:** Dr Voss Thorne  
**Scope:** Unblock VS Code Marketplace publish for code2md v1.2.1+

---

## Problem

code2md v1.2.1 is fully released on GitHub with a clean VSIX attached, but the VS Code Marketplace listing remains on v1.1.29. Publishing requires a valid `VSCE_PAT` (Azure DevOps Personal Access Token with Marketplace Manage scope), which is currently unset or expired. Manual `npx vsce publish` is the only path today — fragile and undocumented.

## Solution

Add a GitHub Actions workflow (`.github/workflows/publish.yml`) that triggers automatically on every GitHub Release publish event. The workflow:

1. Checks out the repo
2. Installs deps and compiles TypeScript
3. Runs `npx vsce publish --no-dependencies` with `VSCE_PAT` injected from GitHub Secrets

This eliminates the manual PAT dependency from the local dev machine and makes every future release self-publishing.

## One-Time Setup (Luke must do this)

1. **Get a new VSCE_PAT:**
   - Go to https://dev.azure.com → top-right avatar → Personal Access Tokens
   - New token → Organization: `All accessible organizations`
   - Scope: **Marketplace → Manage**
   - Copy the token

2. **Add to GitHub repo secrets:**
   - https://github.com/lukejmorrison/code2md/settings/secrets/actions
   - New secret: name = `VSCE_PAT`, value = the token from step 1

3. **Publish v1.2.1 now (one-time manual catch-up):**
   ```bash
   cd ~/dev/code2md
   VSCE_PAT=<your_new_token> npx vsce publish --no-dependencies
   ```

4. **All future releases:** Just publish a GitHub Release — the workflow fires automatically.

## Files Changed

- `.github/workflows/publish.yml` — new file

## Risk

Low. The workflow only fires on `release: published` events. No secrets are exposed in logs. `--no-dependencies` flag prevents bundling `node_modules` into the VSIX (consistent with existing `.vscodeignore`).
