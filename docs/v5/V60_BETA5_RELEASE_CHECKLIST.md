# 6.0.0-beta.5 Release Checklist

<!-- CURRENT_VERSION_SSOT_BEGIN -->
Current application: `6.0.0-beta.5`
Current firmware: `5.1.0-beta.3`
Current Direct API: `1.1.0`
<!-- CURRENT_VERSION_SSOT_END -->

Application: 6.0.0-beta.5
Firmware: 5.1.0-beta.3
Direct API: 1.1.0
Language Pack Architecture 2.1
Language Pack Catalog: 2.1.0

Language packs:
- Hungarian (hu): 1.1.0
- German (de): 1.1.0
- French (fr): 1.0.0
- Spanish (es): 1.0.0
- Italian (it): 1.0.0
- Portuguese (pt): 1.0.0
- Ukrainian (uk): 1.0.0
- Polish (pl): 1.0.0
- Russian (ru): 1.0.0
- Czech (cs): 1.0.0
- Romanian (ro): 1.0.0
- Simplified Chinese (zh-CN): 1.0.0
- Japanese (ja): 1.0.0
- Korean (ko): 1.0.0

- [ ] Exact remote base verified
- [ ] Settings General category verified
- [ ] Settings Connection category verified
- [ ] Settings Updates category verified
- [ ] Settings Hardware category verified
- [ ] Desktop update deep-link verified
- [ ] Mobile/iPad Settings update deep-link verified
- [ ] macOS compatible
- [ ] Windows compatible
- [ ] Linux compatible
- [ ] Android compatible
- [ ] iOS compatible
- [ ] iPadOS compatible
- [ ] npm test passes
- [ ] desktop build passes
- [ ] cargo check/test passes
- [ ] firmware source unchanged
- [ ] secrets untouched
- [ ] user acceptance received before commit/push

## Final V854/V855 acceptance

- [x] Application identity is `6.0.0-beta.5`.
- [x] Firmware identity remains `5.1.0-beta.3`.
- [x] Direct API identity remains `1.1.0`.
- [x] Settings semantic categories are finalized.
- [x] Update deep-link lands in Updates.
- [x] Existing 14 downloadable Language Pack 2.1 packages remain runtime-compatible.
- [x] No new Settings navigation key can force embedded-English fallback.
- [x] Visual 3.1 startup screen complete redesign visually accepted.
- [x] Long-language startup layout regression covered.
- [x] Firmware source unchanged.
- [x] Local secret untouched.
- [ ] Final local pre-publish gate rerun by V855.
- [ ] Commit/push completed by V855.
- [ ] GitHub Beta release workflow completed successfully.
- [ ] `v6.0.0-beta.5` prerelease verified.
