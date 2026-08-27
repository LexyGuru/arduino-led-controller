# Arduino LED Controller 6.0.0-beta.5

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

## Beta.5 focus

- Settings information architecture split into General, Connection, Updates and Arduino/Hardware categories.
- Update notifications deep-link directly to Updates instead of the top of a long Settings page.
- One shared Settings target/state model for macOS, Windows, Linux, Android, iOS and iPadOS.
- Responsive presentation layer for desktop, tablet and mobile.
- Touch-target, overflow and safe-area guards.
- Firmware and Direct API remain unchanged.

## 6.0.0-beta.5 final scope

Application: **6.0.0-beta.5**  
Firmware: **5.1.0-beta.3**  
Direct API: **1.1.0**  
Release channel: **beta**  
Application branch: **next/v5-rearchitecture**

### Settings information architecture

The Settings surface is reorganized into four semantic areas:

- General
- Connection and authentication
- Updates
- Arduino and LED hardware

Update notifications now deep-link into the Updates area instead of opening Settings at the top. The same semantic target model is shared across desktop, tablet and mobile presentations.

### Language Pack 2.1 compatibility

Language Pack Architecture **2.1** and catalog **2.1.0** remain unchanged.

The application continues to expose **15 languages** total: English is embedded and 14 downloadable packs are provided for Hungarian, German, French, Spanish, Italian, Portuguese, Ukrainian, Polish, Russian, Czech, Romanian, Simplified Chinese, Japanese and Korean.

The new Settings navigation intentionally reuses translation keys that already exist in all currently published downloadable packs. This avoids embedded-English fallback labels for users who already have an existing pack installed. No Language Pack branch publication is required for this Beta.5 Settings change.

### Startup screen redesign

The Visual 3.1 startup/loading screen was redesigned as one coherent command card:

- compact brand and version header;
- three runtime status summaries;
- two-column startup-check grid on desktop;
- single-column layout on mobile/tablet;
- auto-height translated labels and details;
- long-language wrapping without block overlap;
- compact short-viewport mode;
- historical no-scroll startup contract preserved.

### Validation

The Beta.5 candidate is required to pass:

- Test Architecture v2 current + regression suites;
- Settings deep-link and cross-platform compatibility contracts;
- all 14 published Language Pack existing-key compatibility checks;
- startup long-language and complete-redesign contracts;
- desktop frontend production build;
- Rust check and Rust tests;
- repository validation;
- firmware-source unchanged guard;
- local `secrets.h` untouched guard.
