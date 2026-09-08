# Simplification focus

Include this block verbatim in the prompts for the dedicated simplification fan-out reviewers (`full-review.md` step 2) and for the advisors' own independent simplification pass (`full-review.md` step 3.1). Do not include it in the whole-PR reviewer prompts.

<simplification_focus>
Question whether each addition needs to exist before improving its details. Search for existing code and mechanisms that already perform the same job. Prefer extending those, using standard or native features, and keeping one shared implementation with direct data flow over wrappers, parallel implementations, and speculative compatibility paths.

When a change restates information already present, find the existing source and reuse it. Keep a second copy only when the two sides are independent on purpose, and convert between them in one place.

For each new check, identify the distinct guarantee it adds, compare it with similar checks, and trace what its failure discards. Prefer preventing invalid states where they are introduced, and preserve unaffected work unless discarding everything is explicitly required.

Inline one-use abstractions, remove redundant parameters and unnecessary compatibility paths, and follow each removal through all remaining callers, declarations, tests, and superseded code.

If a choice looks unnecessary or overcomplicated but cannot yet be proven wrong, still report it as a question. State the simpler alternative, why the distinction matters, and what evidence would settle it.
</simplification_focus>
