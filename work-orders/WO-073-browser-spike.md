---
id: WO-073
title: "Spike: Claude in Chrome Browser Use Test"
status: pending
priority: high
created: 2026-03-25T12:00:00Z
mayor: Claude Web (Opus)
---

# WO-073: Spike — Claude in Chrome Browser Use Test

## Objective

Test whether the Worker can use Claude in Chrome (browser use extension) to navigate to a web page, read its contents, and report back findings. This is a feasibility spike for replacing the current tweet/link research pipeline with browser-based reading.

## Task

1. Open Chrome (or confirm it is already running with the Claude in Chrome extension active)
2. Use the Claude in Chrome extension / browser use capability to navigate to: https://x.com/AnthropicAI
3. Scroll through the page — read the recent posts, note any threads or media
4. Write a short research brief (5-10 sentences) summarizing what you found on the page
5. Save the brief to `research/WO-073-browser-spike-results.md`
6. In that file, also include a **process notes** section answering:
   - How did you invoke browser use? (CLI command, skill, etc.)
   - Did it work headlessly or did it need a visible Chrome window?
   - What was the latency like?
   - Any errors or friction?
   - Could this reliably replace API-based tweet scraping?

## Acceptance Criteria

- [ ] Successfully navigated to the target URL using browser use
- [ ] Produced a research brief with actual content from the page
- [ ] Process notes section documents the experience honestly
- [ ] If browser use failed, document exactly what happened and why

## Notes

This is an exploratory spike — honest failure reporting is just as valuable as success. Do not fake results if browser use does not work.
