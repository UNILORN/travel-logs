---
name: "feature-deliberation-cycle"
description: "Use when planning or implementing a new feature in this travel-logs repository. Runs a project-specific cycle that selects relevant stakeholder and end-user personas from `agents/`, synthesizes requirements, debates risks with sub-agents only where useful, then drives design, implementation, verification, and decision logging."
---

# Feature Deliberation Cycle

Use this skill for new feature development in `travel-logs`.

This skill is not a license to run a long roleplay. The goal is to improve product and engineering decisions while keeping execution fast.

## What This Skill Does

It turns a vague feature request into a short sequence:

1. Frame the problem
2. Select only the relevant project personas
3. Run a bounded debate that produces concrete artifacts
4. Synthesize a decision
5. Implement on the main agent
6. Verify and record residual risks

The main agent owns the critical path. Sub-agents are used for bounded sidecar thinking, not for endless discussion or for urgent blocking work that the main agent should do directly.

## Required Inputs

Before using the cycle, gather:

- the user request
- current repository context
- affected routes, components, state, and data model
- whether the task is ideation only, design + implementation, or implementation from a fixed spec

Read the project personas in `agents/` only as needed. Do not load every file by default.

## Persona Selection

Always include:

- `agents/stakeholders/aya-sakamoto-founder-product-owner.md`
- `agents/stakeholders/ryo-nakahara-product-manager.md`
- one or more relevant end users from `agents/users/`

Include by concern:

- UX or interaction change:
  `agents/stakeholders/mika-hoshino-product-designer.md`
- frontend state, forms, navigation, charts, map UI:
  `agents/stakeholders/daichi-morita-frontend-engineer.md`
- persistence, API, import/export, sharing, auth, data model:
  `agents/stakeholders/kento-fujisawa-platform-engineer.md`
- quality, regression, edge cases, release safety:
  `agents/stakeholders/nozomi-takeda-qa-release-engineer.md`
- accessibility, research uncertainty, mixed user contexts:
  `agents/stakeholders/emi-kurata-user-researcher.md`

Pick end users by feature:

- couple planning, light planning UX:
  `agents/users/yui-tanabe-couple-weekender.md`
- shared understanding, read-only companion, concise overview:
  `agents/users/shota-tanabe-shared-trip-collaborator.md`
- family logistics, budget realism, low-friction on-trip usage:
  `agents/users/haruka-nishimura-family-trip-coordinator.md`
- dense itinerary, export fidelity, data correctness:
  `agents/users/takumi-arai-solo-detail-planner.md`

## Cycle

### Phase 1: Frame

Produce these artifacts before any debate:

- problem statement in 1-2 sentences
- target user and why
- non-goals
- constraints from the current codebase
- unknowns that could invalidate the approach

If the request is too ambiguous and the missing information is genuinely decision-critical, ask the user one concise question. Otherwise proceed with explicit assumptions.

### Phase 2: Debate

Run a short structured debate. The output must be concrete, not theatrical.

Each selected persona should contribute:

- what they optimize for
- their main concern
- the strongest objection to the obvious solution
- one recommendation

Then synthesize:

- agreed outcome
- rejected options
- open risks

If sub-agents are available and useful, use them selectively:

- ask one sub-agent to argue product/UX concerns from chosen stakeholders
- ask one sub-agent to argue implementation/quality concerns from chosen engineering stakeholders

Do not split the same responsibility across many agents. Do not wait on sub-agents unless their result is needed immediately. Do not delegate the final decision or the implementation ownership.

### Phase 3: Spec

Convert the debate into a compact implementation spec:

- user-visible behavior
- affected screens and routes
- state/data model changes
- empty/loading/error/degraded states
- analytics or logging if relevant
- acceptance criteria
- verification plan

For this repository, always check whether the feature touches:

- `lib/types.ts`
- `lib/trip-context.tsx`
- route files under `app/trip/[id]/`
- feature components under `components/`
- import/export behavior in `lib/trip-json.ts` or `lib/trip-json-schema.ts`

### Phase 4: Implement

Implement on the main agent unless a disjoint parallel write can safely be delegated.

Prefer:

- small, coherent patches
- explicit state transitions
- compatibility with the current `spots` and `nodes` dual model where relevant
- maintaining mobile-first UX

If the feature is large, land it in thin vertical slices:

1. data model / state
2. UI behavior
3. verification

### Phase 5: Verify

Minimum verification:

- inspect changed code paths
- run targeted checks when available
- run `pnpm exec tsc --noEmit` if types may be affected
- run `pnpm build` or `pnpm dev` checks when behavior warrants it

Because this repo has no formal test framework, explicitly list:

- what was verified
- what was not verified
- residual risks

### Phase 6: Report

Return a concise report with:

- decision summary
- implemented changes
- verification
- follow-up ideas only if they are natural next steps

## Better-Than-Naive Rules

These override a naive "let all agents discuss everything" approach:

- select the minimum viable council for the feature
- require dissent before convergence
- debate once before coding, not at every micro-decision
- keep implementation ownership with the main agent
- use sub-agents to surface blind spots, not to imitate meetings
- prefer concrete artifacts over persona chatter
- if the repository clearly constrains the solution, let code reality win over persona preference

## Output Template

Use this structure when the user asks for a new feature cycle:

```text
Feature frame
- Problem:
- Target user:
- Non-goals:
- Constraints:

Council
- Personas selected:
- Key objections:
- Decision:

Implementation spec
- UX behavior:
- Code areas:
- Acceptance criteria:
- Verification plan:

Execution
- Changes made:
- Verification:
- Residual risks:
```

## Codex Invocation

Prefer explicit invocation in Codex with `$feature-deliberation-cycle`.

Example prompts:

- `Use $feature-deliberation-cycle to design and implement trip sharing for family travelers.`
- `Use $feature-deliberation-cycle to evaluate adding local draft autosave. Ideation only, no code yet.`
- `Use $feature-deliberation-cycle to add a quicker budget entry flow for couple weekend trips.`

## References

Load only as needed:

- workflow details and debate prompts: `references/workflow.md`
- Codex usage examples: `references/codex-usage.md`
