# Workflow Reference

## When To Use Which Council

### UI-heavy feature

Use:

- Aya
- Ryo
- Mika
- Daichi
- one or two end users
- Nozomi if the change is easy to regress

Example asks:

- new timeline editing affordance
- budget input redesign
- bookshelf information hierarchy

### Data or platform-heavy feature

Use:

- Aya
- Ryo
- Kento
- Daichi if UI is exposed
- Nozomi
- Takumi when data fidelity matters

Example asks:

- persistence
- sharing
- import/export changes
- auth

### Ambiguous user-value feature

Use:

- Aya
- Ryo
- Emi
- Mika
- the most affected end user

Example asks:

- trip memories
- collaboration hints
- recommendation surfaces

## Debate Prompts

Give each selected persona a bounded prompt like:

```text
You represent [persona file].
For the proposed feature, answer in four bullets only:
1. What are you optimizing for?
2. What is your strongest concern?
3. What is your strongest objection to the default solution?
4. What should the team do?
Keep it concrete and tied to this repository.
```

Then synthesize with:

```text
Summarize the council discussion into:
- core tension
- decision
- rejected options
- implementation implications
- risks that need explicit validation
```

## Recommended Sub-agent Split

Only use sub-agents when the task is non-trivial and the split is clean.

Recommended pattern:

- Sub-agent A: product/UX council summary
- Sub-agent B: engineering/QA council summary
- Main agent: repository analysis, final synthesis, implementation

Avoid:

- one sub-agent per persona
- handing implementation planning entirely to sub-agents
- waiting on both sub-agents before doing any local analysis

## Decision Log Checklist

Before implementation, make sure the synthesis answers:

- who is the primary beneficiary
- what user behavior changes
- what code areas are touched
- what is intentionally not included
- what could break
- how success will be checked
