# Evaluation Criteria

Grading rubric for the Evaluator agent. Apply the relevant domain section(s) based on the plan's scope.

## Universal Criteria (always apply)

### Functionality (threshold: 7/10)
| Score | Description |
|-------|-------------|
| 1-3 | Core features broken or missing |
| 4-6 | Most features work but significant bugs or missing edge cases |
| 7-8 | All specified features work correctly, minor edge case gaps |
| 9-10 | Everything works, edge cases handled, feels polished |

### Completeness (threshold: 7/10)
| Score | Description |
|-------|-------------|
| 1-3 | Less than half of plan's acceptance criteria met |
| 4-6 | Most criteria met but notable gaps |
| 7-8 | All acceptance criteria met |
| 9-10 | All criteria met plus thoughtful additions that enhance the deliverable |

### Code Quality (threshold: 6/10)
| Score | Description |
|-------|-------------|
| 1-3 | Security vulnerabilities, broken error handling, spaghetti logic |
| 4-5 | Works but messy — inconsistent patterns, poor naming, no error handling |
| 6-7 | Clean, follows project conventions, handles errors at boundaries |
| 8-10 | Excellent — well-structured, maintainable, good separation of concerns |

## UI / Frontend (apply when plan includes web UI)

### Design Quality (threshold: 6/10)
| Score | Description |
|-------|-------------|
| 1-3 | Unstyled or visually broken — layout issues, unreadable text, clashing colors |
| 4-5 | Functional but generic — default styling, no visual coherence |
| 6-7 | Cohesive design — consistent spacing, typography, color palette. Looks intentional. |
| 8-10 | Polished — attention to detail, micro-interactions, responsive, feels professional |

**UI-specific checks:**
- Does it match the project's existing design system (if one exists)?
- Is text readable? Sufficient contrast?
- Does it work on mobile viewports?
- Are loading and error states handled?
- No purple gradients over white cards (the "AI slop" pattern).

## Backend / API (apply when plan includes API work)

**API-specific checks:**
- Do endpoints return correct status codes (not 200 for errors)?
- Is input validation present at the boundary?
- Are error responses structured and useful?
- Does authentication/authorization work correctly?
- Are there SQL injection, XSS, or command injection risks?

## Pipeline / Script (apply when plan includes data pipelines or scripts)

**Pipeline-specific checks:**
- Does it handle expected input formats correctly?
- What happens with malformed input?
- Does it clean up after itself (no orphan processes, temp files)?
- Are timeouts configured for external calls?
- Is logging sufficient for debugging failures?

## Discord Bot (apply when plan includes Discord functionality)

**Bot-specific checks:**
- Do commands respond correctly?
- Does it handle unknown commands gracefully?
- Are DM permissions set correctly?
- Does the bot presence update?
- No orphan processes after restart?
