# Workbench Chat — conversational center rail

Purpose: render conversational timeline + composer capturing user steering instructions.

Forbidden: collapsing Plan timelines into chat bubbles as the sole UX (Workspace remains authoritative per ADR-0004 unless superseded).

## Message rendering (`Message` array)

Ascending sort by ISO `createdAt`. Roles:

| `role` | Layout |
|--------|--------|
| `user` | Right-aligned “pill” aligning with cogito-esque human emphasis |
| `assistant` | Left card w/ bordered surface |
| `system` | Not shown as bubbly transcript (debug overlays future-gated — default hidden) |

### Streaming representation

If `isStreaming`:

- Maintain stable React keys keyed by logical message id — never regenerate entire subtree each token tick.
- Subtle caret / gradient shimmer permissible.
- Respect scroll policy (below).

Thinking indicator localized copy example: **Agent 正在思考…** (zh-CN surfaced string; docs remain English explanatory).

Assistant secondary metadata (relative absolute hybrid) permissible bottom-right subdued.

### Scroll + stickiness rules

Upon local user sends: snap scroll to newest unless reader explicitly detached (future “jump latest” chip).

Historical reading must not jitter when remote streaming updates arrive without user opting in.

### Composer

- Minimal height dual-line auto growth capped ~`168px` inner scroll thereafter.
- `Shift+Enter` newline; primary send via button + `Meta+Enter`.
- Attachment icon visible but disabled with tooltip (**即将推出**) until roadmap unlocks ingestion.

Ensure composer remains keyboard navigable (`aria-multiline`, proper label association).

