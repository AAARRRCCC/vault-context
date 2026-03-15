---
researched: "2026-03-12T07:55:20.018Z"
category: tool, data-science
signal: low
actionable: false
---

# kuva — Rust scientific plotting library with 29 plot types, SVG/PNG/PDF output, and in-terminal rendering via CLI

## Substance

kuva is a Rust crate (v0.1.1, MIT) by James Ferguson, a bioinformatician at the Garvan Institute. It provides a scientific plotting library with 29 plot types — scatter, volcano, ridgeline, box, Sankey, and more — with SVG as the primary output format and optional PNG/PDF backends via feature flags. The architecture separates the library (embeddable in Rust projects via `Cargo.toml`) from a CLI binary installable via `cargo install kuva --features cli`.

The headline feature is terminal rendering: passing `--terminal` to the CLI outputs plots directly in the shell using ASCII, UTF-8, and ANSI escape codes — no GUI, no file, no browser. The quoted tweet images show this working for multi-panel plots and Sankey diagrams rendered as colored block characters in the terminal. This is not a new concept (gnuplot has done ASCII plotting for decades), but the quality of the ANSI rendering shown in the images looks substantially better than typical ASCII art approaches.

The CLI accepts TSV/CSV input with auto-detection, column selection by name or index, and stdin piping. For use as a library, the API follows a builder pattern (`ScatterPlot::new().with_data(...).with_color(...)`). The README includes a notable development disclaimer: the library skeleton was written by hand, then Claude (Anthropic) was used heavily to accelerate plot type implementation, CLI work, tests, and docs — with the author explicitly crediting and scoping Claude's role.

The project is early-stage (v0.1.x) and bioinformatics-oriented (volcano plots, ridgeline/expression plots), but the core plotting engine is domain-agnostic.

## Linked Content

### github.com/Psy-Fer/kuva
Full README fetched successfully. Covers: install instructions (cargo install), library usage with Rust code example, CLI usage with five example commands, link to full docs at psy-fer.github.io/kuva, and the AI development disclaimer. No architecture deep-dive in the README itself — implementation details are in the linked mdBook docs site. 29 plot types claimed; the overview SVG in the README shows all of them rendered as a grid. CI badge is passing.

### crates.io/crates/kuva/0.1.1
JavaScript-required page, rendered as near-empty. No additional metadata extractable. The GitHub README is the authoritative source.

### genomic.social / psy-fer.bsky.social
Author social profiles. JavaScript-required pages, minimal extractable content. Confirms identity: bioinformatician at Garvan Institute.

## Relevance

Brady's NTS project is a Python/React tool for network topology scanning and visualization — kuva is Rust and bioinformatics-oriented, so there's no direct integration path. The terminal rendering angle is conceptually interesting for CLI-heavy workflows (Mayor-Worker automation, foreman-bot, NTS scanning output), but Brady's stack doesn't include Rust and NTS already has a React frontend for visualization. The data science angle is weak — kuva targets genomics-style plots (volcano, expression), not the kinds of charts relevant to Polymarket trading analysis or ML work Brady does in Python.

The Claude-assisted development note is mildly interesting as a process reference (bioinformatician used Claude as an "accelerant, not an author" and disclosed it explicitly in the README), but this is more of a curiosity than actionable insight for Brady's system.

## Verdict

**Skip.** Rust-only, bioinformatics-domain plotting library. Brady's visualization work is Python/React; there's no integration path and no technique here that transfers. The terminal rendering is neat but not novel enough to warrant follow-up. Not relevant to any active project.