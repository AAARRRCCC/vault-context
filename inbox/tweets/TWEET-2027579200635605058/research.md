---
researched: "2026-03-12T06:18:00.992Z"
category: design, reference
signal: medium
actionable: false
---

# component.gallery — a curated reference of UI component names, aliases, and design system examples

## Substance

The tweet's core claim is a practical prompt-engineering tip: when using AI to generate frontend code ("vibecoding"), the quality of the output is constrained by the vocabulary you give it. If you only say "menu" and "button," you get generic slop. If you know the canonical name for what you want — "accordion," "popover," "tree view," "pagination" — you can prompt more precisely and get substantially better results.

The linked resource, **component.gallery**, operationalizes this idea. It is a structured catalog of 60 UI component types drawn from 95 real-world design systems, with 2,676 total examples. Each component entry documents its canonical name, common aliases (e.g., Accordion → "Arrow toggle, Collapse, Collapsible sections, ShowyHideyThing"), a plain-English description of its purpose and behavior, and visual examples pulled from production design systems.

The design systems indexed span a wide range of tech stacks (React + CSS-in-JS, React + Tailwind, Web Components, Vue, Sass) and organizations (Elastic, Red Hat, Ariakit, HeroUI, Morningstar, Sainsbury's, Axis Bank, etc.). Each system entry notes its tech stack, whether it has code examples, usage guidelines, accessibility info, and whether it's open source.

The practical utility of the site is as a lookup table: when you want a UI element that does something specific, you find it here, learn its name, and then use that name when prompting your AI tool — or when searching component libraries for the right primitive.

## Linked Content

### component.gallery/
The fetched page is mostly rendered HTML with limited readable text due to how the JavaScript-heavy site serializes. What comes through clearly:

- **Scope:** 60 components, 95 design systems, 2,676 examples — a substantial reference corpus.
- **Featured components visible in the render:** Carousel, Tree view, Popover, Rating, Accordion, Quote, Pagination, Tabs.
- **Accordion entry** is a good example of the alias-richness: it lists "Arrow toggle, Collapse, Collapsible sections, Collapsible, Details, Disclosure, Expandable, Expander, ShowyHideyThing" as alternative names across design systems.
- **Design systems shown:** Elastic UI, Sainsbury's, Ariakit, SubZero (Axis Bank), Web Awesome, Red Hat, HeroUI (React + Tailwind), Morningstar (Vue).
- The site appears to be built with Astro (evident from `data-astro-cid-*` attributes in the raw HTML).
- Navigation includes "View all" for both Components and Design Systems sections.

The full site at component.gallery is navigable and worth browsing directly — the rendered HTML capture doesn't show the full 60-component index.

## Relevance

The most direct connection is to Brady's **NTS React frontend** and any other web UIs built as part of the Mayor-Worker system (Foreman bot dashboards, monitoring UIs, etc.). When prompting Claude to generate React components for NTS or other tools, having the correct component vocabulary — knowing to ask for a "tree view" instead of "a thing that shows folder structure," or a "popover" instead of "a box that appears when you click" — would yield more targeted, less generic output.

Brady's interest in **web UI design quality** is explicitly noted as a current project interest, making this directly on-point. The site is also a useful cheat sheet if Brady or the Mayor are ever reviewing AI-generated frontend code and need to name or critique what they're seeing.

## Verdict

**File for reference.** Bookmark component.gallery as a lookup resource to consult when prompting Claude (or any AI) for frontend UI components — especially during NTS React work or any future Foreman dashboard UI. Not urgent and requires no installation or integration, but genuinely useful as a vocabulary reference the next time a UI prompt produces generic output.