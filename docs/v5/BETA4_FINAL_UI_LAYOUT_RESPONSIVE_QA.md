# Beta.4 Final UI / Layout / Responsive QA

This is a presentation-only closure layer after Update System 2.0 recovery.

Covered:
- Core UI 2.0 topbar version badge separation and wrapping.
- LED bulk/scene/test action wrapping and compact slider-number layout.
- Schedules action toolbar wrapping so Arduino/JSON/destructive actions do not overflow.
- Firmware Update System 2.0 card alignment and responsive single-column fallback.
- Logs unified layout expanded to full content width, with side panels placed below.
- Settings form/theme/update action density and responsive wrapping.
- Global min-width / horizontal-overflow containment.

No controller, OTA, updater, API, release workflow, firmware, Rust or LXC behavior changes.

## V554 follow-up

<!-- BETA4_FINAL_PAPERWORK_V554 -->

V549 closed the topbar/action/layout responsive layer, but a separate legacy sidebar
badge-position collision remained between `UI 2.0` and `Beta 4`. V554 adds a final
presentation-only sidebar override: the two pills are vertically separated in the full
desktop sidebar and hidden together in compact tablet mode.
