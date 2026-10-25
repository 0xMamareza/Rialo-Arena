# Localization

## Supported languages

English remains the default. The requested additional locales are:

| Locale | Language | Selector label | Direction |
| --- | --- | --- | --- |
| zh-CN | Simplified Chinese | 简体中文 | LTR |
| ko | Korean | 한국어 | LTR |
| vi | Vietnamese | Tiếng Việt | LTR |
| ru | Russian | Русский | LTR |
| uk | Ukrainian | Українська | LTR |
| id | Indonesian | Bahasa Indonesia | LTR |
| hi | Hindi | हिन्दी | LTR |
| tr | Turkish | Türkçe | LTR |
| th | Thai | ไทย | LTR |
| pt-BR | Brazilian Portuguese | Português (Brasil) | LTR |
| ur | Urdu | اردو | RTL |
| bn | Bengali | বাংলা | LTR |
| ar | Arabic | العربية | RTL |
| fa | Persian | فارسی | RTL |

The screenshot entries “Pakistan,” “Bangladesh,” and “Arabic Countries” are interpreted as Urdu, Bengali, and Arabic. “Africa” is excluded at the user's explicit request; it is a region, not a language. Country flags are not used as language identifiers.

## Content and safety boundaries

- Catalogs live in `src/lib/i18n/messages/`. They are keyed by normalized original English copy. Preserve interpolation tokens such as `{score}` exactly.
- Localization is presentation-only. Canonical question IDs, question/choice order, correct answers, server clocks, ETags, identities, scores, and rank-tier enum values must not change with the chosen language.
- Quiz catalogs contain public question and option text, never `correctOption` or a correct-option mapping. Never import the canonical answer bank into a client component.
- Preserve technical identifiers, proper names, URLs, protocol abbreviations, example credentials, and user handles. Text direction must not reverse protocol diagrams or code.
- English fallback is a resilience mechanism, not a substitute for catalog coverage. Verify every locale against the English inventory before release.
- The selected locale is stored in a dedicated preference cookie. It is not an authentication mechanism. Do not add identity or quiz mutation behavior to the selector.

## Translation provenance and review

The initial additional-language catalogs are **machine-assisted translations**, generated at development time from the app's public English copy with Google's translation endpoint. There is no runtime translation service dependency and no API key is required by the application.

Machine assistance is not proof of native-language accuracy. Native speakers should review the technical lessons, quiz phrasing/distractors, and result-card wording before a public localized release. Structural checks establish completeness and intact placeholders, not linguistic equivalence. Keep corrections in the shipped JSON and the generator's review overrides/cache when regenerating.

## Updating catalogs

From the repository root, with the project's supported Node 24 runtime:

```sh
node scripts/extract-i18n-messages.mjs /absolute/scratch/messages.json
# Review new English messages and update each checked-in locale JSON.
npx tsx scripts/verify-i18n-catalogs.ts
```

The extraction script includes original public copy for data-driven translation calls, current literal `t(...)` calls, public validation errors, and every canonical public question/option. Review the inventory if moving or removing content: original English is retained intentionally to cover dynamic data and should not grow without bounds. Do not overwrite corrected translations when adding messages.

No online translation generator is shipped with the app. The one-off development tooling rejected damaged boundaries/protected terms and was kept with task evidence rather than becoming a runtime or maintenance dependency. Update the checked-in catalogs as reviewed source; preserve interpolation placeholders and technical identifiers. Catalog edits never publish the site.

On this checkout dependencies are installed for Linux under WSL, not native Windows. Use the installed WSL Node 24 runtime for `tsx`, builds and lint; do not reinstall platform-specific dependencies in place just to run a check from Windows.

## Release gates

Local implementation/testing and production deployment are separate. Verify typecheck, lint, catalog coverage, existing quiz-bank validation, a production build, and desktop/mobile browser switching (including Persian/Arabic/Urdu direction and an in-progress attempt). Confirm long translated text and localized PNG card output render without clipping. Do not deploy until the user approves publishing the changed site.
