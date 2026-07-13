# WhackSmacker Website Update Rules

Policy version: 2
Last updated: 2026-07-13

This file is the canonical human-readable policy for public WhackSmacker website updates. `data/website-update-policy.json` is the stable machine-checkable subset, and its schema is `schemas/website-update-policy-v1.schema.json`. Keep all three synchronized. This Markdown policy controls nuanced editorial interpretation.

## Publication structure

A normal daily update has four targets:

- `index.html`: the newest short Human Voice card;
- `human-voice/index.html`: the newest Human Voice archive entry;
- `progress.html`: the combined Human Voice and technical update;
- `data/progress.json`: one concise milestone, newest first.

Do not create a separate long-form article unless Ashwin explicitly requests one. Preserve existing cards, archive entries, posts, and milestones.

## Human Voice

Human Voice is supplied exclusively by Ashwin. It must never be generated, rewritten, paraphrased, corrected, substituted, polished, expanded, summarized, or explained by ChatGPT or Codex. Preserve supplied text exactly on the homepage, Human Voice archive, and Progress page. If Ashwin has not supplied Human Voice text for an update, leave the section pending. Human Voice remains one subsection of the combined update and must not become the entire technical update unless explicitly instructed.

## Technical update style

Report outcomes, not a work diary. Prefer what became available, what was updated, what remains unavailable, the current validation state, and the next concrete task.

Avoid detailed code-edit descriptions, internal schema inventories, validator implementation details, step-by-step debugging narratives, long explanations of individual formatting decisions, and copied internal handoff documents. An important public operational incident may be summarized only by its outcome and public relevance.

## Changed modules only

Mention only modules or curricula changed during that local calendar day. Do not list unchanged modules for completeness.

For curriculum work, normally state the language or module, updated chapter range or total, review and summary status when materially changed, and whether the next chapter exists when that avoids ambiguity. Prefer concise forms such as `Dutch — updated through Chapter 15`.

Do not normally publish internal lexical, cast, grammar-policy, validator, schema, or formatting details.

## Accuracy

Verify public claims against the available evidence. Never claim that chapters exist when they do not, that an entire suite passed when it hung or did not complete, that packages are absent when installed but incompatible, that unchanged modules were updated, or that a diagnostic production edit is the permanent source fix.

Preserve distinctions including installed versus selected, target curriculum versus source language, built versus deployed, focused tests passed versus complete suite passed, and known failure versus newly introduced failure.

## Historical and current content

Do not rewrite dated historical entries merely because the current state changed. Correct only undated or explicitly current-status claims that have become stale, and only when directly contradicted by the verified update.

## Scope control

A normal update must not broadly rewrite CSS, navigation, roadmap, downloads, unrelated homepage sections, module cards, or historical entries. Touch an additional file only when it contains a directly contradicted current fact.

## Privacy and operational security

Never publish passwords, tokens, cookies, session or CSRF values, `.env` contents, database connection strings, private account names unless expressly approved, internal IP addresses, private hostnames, private paths, backup paths, or unpublished credentials.

Public URLs, repositories, release names, public Docker tags, and intentionally public package counts are permitted.

## Tone

Keep technical writing direct, factual, modest, concise, and public-facing. Do not oversell alpha software. Retain the site's mildly informal WhackSmacker character without turning the technical update into jokes.

## Validation and review

Use `editorial/templates/daily-update.md` while drafting and `editorial/checklists/update-review-checklist.md` before publication. Run:

```bash
npm run validate:editorial
npm run build:developer-notes
git diff --check
```

For an update with Human Voice, also run the validator with `--human-voice` and `--date`. The machine policy deliberately encodes stable structure and invariants, not every editorial judgment in this document.
