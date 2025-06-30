# Code2MD Extension - Product Reference & Decisions

## Activation Events Requirement

- The `activationEvents` property **must** be present in `package.json` for any extension with a `main` entry point (i.e., one that runs code, not just UI contributions).
- Even though VS Code can infer activation events for UI-only extensions, the VSCE packaging tool requires this property for main-activated extensions.
- If you remove `activationEvents`, packaging will fail with: `ERROR  Manifest needs the 'activationEvents' property, given it has a 'main' property.`
- Always keep the following in `package.json`:

```json
"activationEvents": [
  "onCommand:code2md.generateMarkdown",
  "onCommand:code2md.generateMarkdownFromFolder",
  "onCommand:code2md.generateMarkdownContext"
]
```

## Consistency Note

- If you add new commands, update both the `commands` and `activationEvents` arrays.
- This ensures compatibility with VSCE and consistent extension activation.

---

_Last updated: 2025-06-30_
