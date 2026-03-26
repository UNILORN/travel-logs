# Codex Usage

## Recommended Prompt Shape

Call the skill explicitly:

```text
Use $feature-deliberation-cycle to [goal].
Scope: [optional routes or files]
Mode: [ideation only | design + implementation | implementation]
Constraints: [optional]
```

## Good Examples

```text
Use $feature-deliberation-cycle to add trip draft autosave.
Mode: design + implementation
Constraints: keep the current mobile-first UX and respect the existing spots/nodes migration period.
```

```text
Use $feature-deliberation-cycle to redesign budget entry for family travelers.
Scope: /trip/[id]/budget and related state only
Mode: ideation only
```

```text
Use $feature-deliberation-cycle to add a read-only share view for travel companions.
Mode: design + implementation
Constraints: prefer a thin vertical slice and identify data-model risks before coding.
```

## Expected Behavior In Codex

The skill should cause Codex to:

- inspect the repository first
- select only the relevant personas from `agents/`
- run a bounded council, not a long roleplay
- synthesize a concrete implementation spec
- implement if asked
- verify and report residual risks
