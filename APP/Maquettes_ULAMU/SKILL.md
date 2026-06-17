---
name: ulamu-design
description: Use this skill to generate well-branded interfaces and assets for ULAMU — a digital health platform for Congo-Brazzaville (patient mobile app + professional desktop app, French only). Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping or production.
user-invocable: true
---

Read the `readme.md` file within this skill, and explore the other available files. For production implementation, read `handoff/README.md` — it maps every mockup to an implementation spec (routes, states, events, data) and lists the open decisions.

ULAMU is a trust-first digital health platform for Congo-Brazzaville. Two surfaces: a **patient mobile app** (3 tabs + floating Urgence button) and a **professional desktop app** (sidebar + topbar). **French only.** Dark theme by default. One accent (cobalt blue). Signature effects: screen-printed grain + glass surfaces. No gradients (except area charts).

Key starting points:
- `styles.css` — single global entry (link this one file).
- `tokens/` — colors, typography, spacing, effects, fonts.
- `components/` — React primitives (Button, Input, Card, Badge, Icon, SessionTimer, VerifiedBadge…), exposed at runtime under `window.ULAMUDesignSystem_d14300`.
- `components/core/icons.js` — the embedded, offline Lucide-style icon catalogue (use `<Icon name="…" />`; never emoji or Unicode glyphs).
- `ui_kits/` — full interactive recreations of both products (read these to match real layouts).
- `assets/` — logos & favicon.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc.), copy assets out and create static HTML files for the user to view: link `styles.css`, load the bundle via `<script src=".../_ds_bundle.js">`, then read components from `window.ULAMUDesignSystem_d14300` inside a `<script type="text/babel">` block. If working on production code, copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask a few focused questions (which product? patient or professional? which flow?), and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need. Respect the content fundamentals (French, vouvoiement, sentence case, `5 000 F` money format, métier vocabulary: poignée de main, session, dévoilement, ordonnance…).
