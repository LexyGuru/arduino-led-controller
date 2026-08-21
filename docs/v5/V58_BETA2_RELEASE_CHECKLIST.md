# Arduino LED Controller V5.8 Beta.2 — Test Build Checklist

> **TEST BUILD ONLY — NO GITHUB RELEASE / NO TAG**

Application: `5.8.0-beta.2`
Firmware: `5.1.0-beta.2`
Direct API: `1.0.0`

## Source / build gates

- [ ] Exact source tree reconstructed from the approved staged candidate.
- [ ] Beta.2 version sources are consistent.
- [ ] Active current-version test contracts contain no stale Beta.1 identity.
- [ ] Historical Beta.1 documentation contracts remain preserved.
- [ ] Mobile schedule focused contracts pass.
- [ ] LED topology feedback/logging contracts pass.
- [ ] Desktop web build passes.
- [ ] Full repository test suite passes.
- [ ] Repository validation passes.

## Post-push physical test

- [ ] Download GitHub build artifact.
- [ ] Verify seven-day mobile schedule layout on iPhone.
- [ ] Verify no horizontal schedule scrolling.
- [ ] Verify day switching updates the event list.
- [ ] Verify add/edit opens the full-screen editor.
- [ ] Verify topology save feedback and firmware log event.

## Not part of this step

- [ ] GitHub Release creation — intentionally not performed.
- [ ] Git tag creation — intentionally not performed.
- [ ] `main` promotion — intentionally not performed.
