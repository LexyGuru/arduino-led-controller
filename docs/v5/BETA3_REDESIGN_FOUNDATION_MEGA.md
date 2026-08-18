# Beta.3 Redesign Foundation Mega

V507 starts the UI/UX redesign without changing OTA2 business logic.

- splits i18n runtime exports out of the React TSX module to fix Vite Fast Refresh invalidation
- keeps I18nProvider/useI18n as the React-only boundary
- adds a dedicated redesign override stylesheet after existing Beta.3 styles
- normalizes page width, spacing, headings, actions and responsive grids
- preserves firmware/OTA2 logic and app version

No commit/push/version bump. Firmware source unchanged.
