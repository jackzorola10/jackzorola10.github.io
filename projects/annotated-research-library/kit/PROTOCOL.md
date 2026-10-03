# Protocol (for you and for any AI assistant)

When a new video, article, podcast or report arrives, process it fully in one session. A half-annotated source never gets reopened: better fewer sources done well.

1. **Save the original first** in `Sources/Originals/` with URL, author, publication date and capture date. Verbatim, including transcription errors: correcting them is already interpretation.
2. **Assign the next free ID** from `source-index.md`. Never reuse one, even for a discarded source.
3. **Annotate** using `templates/source.md`: the central thesis, then claims, each typed:

   | Type | What it is | How to treat it |
   |---|---|---|
   | 📊 Data | A figure or fact checkable against a primary source | Verify it before it supports any decision; record the result and the year, whether it confirms or refutes |
   | 🧩 Model | An illustrative calculation or framework | Use it to reason; never quote it as a statistic |
   | 🧭 Thesis | An interpretation or argument | Weigh and compare it; it can't be "verified" |
   | 📎 Anecdote | One case | Proves possibility, not frequency |

   A claim is one idea that can be confirmed or refuted on its own. If two ideas always travel together, they're one claim.
4. **Read critically:** where is it solid, where does it overreach, what does it leave out, what's the author's incentive?
5. **Verify every 📊** against the primary source before closing the session.
6. **Cross-check** against what's already in the library. Log validations, contradictions, nuances and clashes with existing decisions in `tensions-log.md`, with both claim IDs and a hypothesis. Before calling two sources a validation, confirm they don't share a primary source.
7. **Update the index** and the links on *both* sources.

Never rewrite a source's claim as if it were your own. Cite it, classify it, question it.
