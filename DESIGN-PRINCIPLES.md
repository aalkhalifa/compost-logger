# Design Principles

> **Scope: product-agnostic.** These apply to Compost Logger and to every product that
> follows it under the same roof, including LivingSoil.ai. Nothing here is specific to
> compost — the subject matter changes, the principles do not.
>
> **Status:** adopted July 22 2026, distilled from a review of UX and conversion research.
> Recorded July 24 2026.
>
> Each item carries its reasoning. The reasoning is the part that transfers to a new
> product; the rule on its own would just be a preference.

---

## Adopted

- **Specifics over ambiguity.** State exact, true numbers everywhere — "15 consecutive
  readings ≥ 131°F", never "compliance tracking".
  *Why:* the best-evidenced pattern across the research reviewed, and it matches the
  engineering honesty this project already practices — the app that says "On-pile
  temperature record, NOT a certified test" should market itself the same way.

- **Value before signup.** The app is fully useful local-only, with no account at all.
  *Why:* this is already true today, so the principle is a guarantee not to break it when
  paid tiers arrive — an account is how you sync and scale, never how you start.

- **Progress not at zero.** Onboarding starts the progress bar at ~20% after the first
  answer, not at empty.
  *Why:* the goal-gradient effect is real research, not a dark pattern — people finish what
  looks already begun, and the first answer genuinely is progress.

- **Ownership via import.** The moment someone's own Excel history is charted, the app is
  theirs; so import quality is a first-class priority, not an accessory feature.
  *Why:* this is the endowment effect earned honestly — the data really is theirs, and we
  are showing it to them rather than manufacturing an attachment they have not earned.

- **Upfront total transparency.** One fixed price, no ranges, no "starting at", and "cancel
  anytime" stated plainly where the price is.
  *Why:* doubt is the most expensive thing in an interface — a user resolving ambiguity
  about cost is a user not evaluating the product.

- **Real-context imagery.** Marketing shows actual pile charts with real temperature
  curves, not abstract feature copy or invented screenshots.
  *Why:* the real artifact is more persuasive than any description of it to the audience
  that matters, and it cannot be accused of overstating what the app does.

- **Smart defaults for data entry.** Reading time defaults to now, last-used pile
  pre-selected, units remembered.
  *Why:* defaults serve the user's next action, not our conversion funnel — that
  distinction is what separates a good default from a pre-checked box.

---

## Rejected

Recorded with what each would have cost, so a later session does not re-propose them.

- **Loss-aversion pressure** — guilt timers, "no thanks, I'll risk it" decline buttons.
  *Why not:* it poisons a brand built on trustworthy data custody and a published privacy
  policy. The product's entire pitch is that we handle your records honestly.

- **Fake urgency and manufactured social proof** — countdowns, invented user counts.
  *Why not:* with a small real audience, fabricated numbers are both a lie and detectable
  by the people we most want. Specific true numbers only, and only once they exist.

- **Journey-style CTA copy** — "Start My Journey", "Begin Your Composting Adventure".
  *Why not:* wrong register for a field logger. The terse voice — LOG READING, TURN NOW —
  *is* the brand, and the CTA is where a brand voice is most load-bearing.

- **Subscription pre-selection with hidden tier reveal.**
  *Why not:* a DTC impulse tactic aimed at unconsidered purchases; our users are making a
  considered tool choice for real work. Show the tiers plainly and let them pick.

---

## Pricing and tier rules

- **Charge for what you add, never ransom what you shipped.** No feature that is free today
  moves behind a paywall.
  *Why:* the alternative punishes exactly the early users who validated the product, and it
  is the single fastest way to lose a small community's trust.

- **The line: single-pile capability is free; multi-pile scale and intelligence are paid.**
  Free keeps full compliance — PFRP, stages, exports — permanently.
  *Why:* free compliance is the wedge against the spreadsheet and the source of credibility
  with the community. Cripple it and there is no reason to switch in the first place.

- **Pro candidates, additive only:** piles above 3, AI consultant (which carries real
  marginal cost), cross-pile analytics, personal baselines, audit-grade exports.
  **Facility:** multi-site, windrows, multi-probe.
  *Why:* each is something that does not exist today, so shipping it takes nothing away —
  and the AI consultant is the one item where a per-user cost genuinely justifies a price.

- **Working hypothesis, unvalidated: Free / Pro ~$9 per month or $79 per year / Facility
  ~$29 per month.**
  *Why flagged:* these numbers have never been put to a real user. Validate by asking with
  a concrete price and a concrete date **before** any billing is built — see the validation
  gate in TODO.md.
