# Sehat Saathi interface

The existing health dashboard is the design contract: calm teal, readable white surfaces, source evidence alongside extracted facts, and explicit review states. English and Hindi share the same information hierarchy. Avoid celebratory effects for medical results.

## Tokens and behavior

- Ink: `#18333b`; primary teal: `#087f78`; surface: `#f7f9fa`; divider: `#e2e9eb`.
- Manrope headings, DM Sans body, Noto Sans Devanagari for Hindi.
- Keep reported values and reference ranges visible together. Status always includes text.
- Tabular numerals align health values. Small-screen form text stays at least 16px.
- Touch controls need 44px targets. Hide closed navigation from keyboard focus.
- Provide a skip link, visible focus, selected navigation semantics, and dialog focus containment/restoration.
- Hover enhancements only apply to hover-capable fine pointers. Respect reduced motion; processing retains its text status.

## Design-engineering pass

Applied guidance from [AgentsORG/design-engineering](https://github.com/AgentsORG/design-engineering), installed as a Codex skill. This app retains its existing health-focused visual identity.

| Before | After | Why |
|---|---|---|
| Mobile sidebar used only `transform:translateX(-100%)` | Closed sidebar also has `visibility:hidden` | Hidden navigation must not receive keyboard focus. |
| Small actions used 32–38px targets | Mobile actions have a 44px minimum | Easier and more reliable touch input. |
| Unconditional `:hover` styles | Hover capability and fine-pointer media queries | Prevent sticky hover effects after tapping. |
| No skip link or menu expansion state | Bilingual skip link, `aria-expanded`, `aria-controls`, `aria-current` | Expose navigation structure and state. |
| Modal focus list omitted `summary` | Visible summaries and selects participate in the trap | Source-evidence controls remain reachable inside the dialog. |

TypeScript and a production build validate integration; these checks do not constitute a full accessibility certification.
