import {
  Check,
  Moon,
  Palette,
  RotateCcw,
  Sparkles,
  Sun
} from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';

import { useTheme } from '../design-system/ThemeProvider';
import { THEME_CATALOG } from '../design-system/theme-catalog';
import {
  CORE_UI_VERSION,
  THEME_ENGINE_VERSION,
  type AccentId,
  type AppearanceMode,
  type ContrastId,
  type DensityId,
  type GlassStrengthId,
  type GlowId,
  type GradientId,
  type MaterialId,
  type MotionId,
  type RadiusId,
  type ThemeId,
  type ThemeTokenName,
  type VisualFxId
} from '../design-system/theme-types';
import { useI18n } from '../i18n';
import { isTauriRuntime } from '../services/tauriApi';
import { ThemeAdvancedEditor } from './ThemeAdvancedEditor';

const MODES: AppearanceMode[] = ['system', 'light', 'dark'];
const ACCENTS: AccentId[] = [
  'blue', 'cyan', 'green', 'purple', 'pink', 'orange', 'red',
  'teal', 'amber', 'lime', 'indigo'
];
const DENSITIES: DensityId[] = ['compact', 'comfortable', 'touch'];
const RADII: RadiusId[] = ['square', 'rounded', 'extra-rounded'];
const MOTIONS: MotionId[] = ['reduced', 'balanced', 'expressive'];
const GLASS: GlassStrengthId[] = ['off', 'soft', 'strong'];
const GLOWS: GlowId[] = ['off', 'soft', 'strong'];
const MATERIALS: MaterialId[] = ['solid', 'translucent', 'glass'];
const GRADIENTS: GradientId[] = ['off', 'subtle', 'vivid'];
const CONTRASTS: ContrastId[] = ['standard', 'high'];
const VISUAL_FX: VisualFxId[] = [
  'none',
  'ambient',
  'scanlines',
  'tech-grid',
  'aurora-flow',
  'soft-pulse'
];

const CUSTOM_COLOR_TOKENS: Array<{
  token: ThemeTokenName;
  labelKey: string;
  fallback: string;
}> = [
  { token: 'background', labelKey: 'appearance.custom.color.background', fallback: '#090512' },
  { token: 'surface', labelKey: 'appearance.custom.color.surface', fallback: '#160d22' },
  { token: 'surfaceRaised', labelKey: 'appearance.custom.color.surfaceRaised', fallback: '#20102f' },
  { token: 'text', labelKey: 'appearance.custom.color.text', fallback: '#fbf7ff' },
  { token: 'textSecondary', labelKey: 'appearance.custom.color.textSecondary', fallback: '#d4c1e4' },
  { token: 'border', labelKey: 'appearance.custom.color.border', fallback: '#5b426d' },
  { token: 'accent', labelKey: 'appearance.custom.color.accent', fallback: '#c084fc' },
  { token: 'accentHover', labelKey: 'appearance.custom.color.accentHover', fallback: '#a855f7' },
  { token: 'success', labelKey: 'appearance.custom.color.success', fallback: '#34d399' },
  { token: 'warning', labelKey: 'appearance.custom.color.warning', fallback: '#fbbf24' },
  { token: 'error', labelKey: 'appearance.custom.color.error', fallback: '#fb7185' }
];

function colorInputValue(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  const hex = /^#([0-9a-f]{6})$/i.exec(value.trim());
  if (hex) return `#${hex[1]}`;

  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(value.trim());
  if (!rgb) return fallback;

  return `#${[rgb[1], rgb[2], rgb[3]]
    .map((part) => Math.max(0, Math.min(255, Number(part))).toString(16).padStart(2, '0'))
    .join('')}`;
}

export function AppearanceSettings() {
  const { t } = useI18n();
  const {
    appearance,
    setAppearance,
    resetAppearance,
    resolvedMode,
    customTheme,
    importThemeProfile,
    exportThemeProfile,
    cloneCurrentTheme,
    clearCustomTheme,
    updateCustomThemeToken,
    renameCustomTheme,
    replaceCustomThemeTokens
  } = useTheme();
  const importRef = useRef<HTMLInputElement>(null);
  const [profileStatus, setProfileStatus] = useState('');

  const update = <K extends keyof typeof appearance>(
    key: K,
    value: typeof appearance[K]
  ) => setAppearance({ ...appearance, [key]: value });

  const setTheme = (theme: ThemeId) => {
    if (theme === 'custom' && !customTheme) return;
    update('theme', theme);
  };

  const exportProfile = async () => {
    const payload = exportThemeProfile();

    try {
      if (isTauriRuntime()) {
        if (!navigator.clipboard?.writeText) {
          throw new Error(t('appearance.profile.clipboardUnavailable'));
        }

        await navigator.clipboard.writeText(payload);
        setProfileStatus(t('appearance.profile.copiedNative'));
        return;
      }

      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'arduino-led-controller-theme-engine-2-profile.json';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
      setProfileStatus(t('appearance.profile.exported'));
    } catch (error) {
      setProfileStatus(
        `${t('appearance.profile.error')}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  const importProfile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      importThemeProfile(await file.text());
      setProfileStatus(t('appearance.profile.imported'));
    } catch (error) {
      setProfileStatus(
        `${t('appearance.profile.error')}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  const cloneTheme = () => {
    cloneCurrentTheme(t('appearance.theme.custom'));
    setProfileStatus(t('appearance.profile.cloned'));
  };

  return (
    <section
      className="panel settings-panel appearance-panel theme-engine-v2 theme-engine-v3 visual31-theme-studio"
      data-mobile-theme-parity="full"
    >
      <div className="panel-title">
        <div>
          <p className="eyebrow">{t('appearance.eyebrow')}</p>
          <h2>{t('appearance.title')}</h2>
          <p className="theme-engine-version">
            Theme Runtime {THEME_ENGINE_VERSION} · Visual 3.1 · Core UI {CORE_UI_VERSION}
          </p>
        </div>
        <Palette />
      </div>

      <div className="appearance-preview theme-engine-hero visual31-theme-preview">
        <div>
          {resolvedMode === 'light' ? <Sun size={24} /> : <Moon size={24} />}
          <strong>
            {appearance.theme === 'custom' && customTheme
              ? customTheme.name
              : t(`appearance.theme.${appearance.theme}`)}
          </strong>
          <span>
            {t(`appearance.mode.${appearance.mode}`)} · {t(`appearance.material.${appearance.material}`)}
          </span>
        </div>
        <Sparkles size={24} />
      </div>

      <div className="theme-section-heading">
        <div>
          <p className="eyebrow">{t('appearance.gallery')}</p>
          <h3>{t('appearance.galleryTitle')}</h3>
        </div>
        <button className="theme-reset-button" type="button" onClick={resetAppearance}>
          <RotateCcw size={15} />
          {t('appearance.reset')}
        </button>
      </div>

      <div className="theme-gallery theme-gallery--v3 visual31-theme-gallery" role="list" aria-label={t('appearance.galleryTitle')}>
        {THEME_CATALOG.map((theme) => {
          const selected = appearance.theme === theme.id;
          const unavailable = Boolean(theme.custom && !customTheme);
          return (
            <button
              type="button"
              role="listitem"
              key={theme.id}
              className={`theme-card theme-card--${theme.id}${selected ? ' is-selected' : ''}`}
              aria-pressed={selected}
              disabled={unavailable}
              onClick={() => setTheme(theme.id)}
            >
              <span className="theme-card__visual" aria-hidden="true">
                <span className="theme-card__orb" />
                <span className="theme-card__panel" />
                <span className="theme-card__chart" />
              </span>
              <span className="theme-card__copy">
                <strong>{theme.custom && customTheme ? customTheme.name : t(theme.nameKey)}</strong>
                <small>{t(theme.descriptionKey)}</small>
              </span>
              {selected && <Check className="theme-card__check" size={18} />}
            </button>
          );
        })}
      </div>

      <div className="appearance-control-grid appearance-control-grid--v3">
        <label>
          {t('appearance.mode')}
          <select value={appearance.mode} onChange={(e) => update('mode', e.target.value as AppearanceMode)}>
            {MODES.map((value) => <option key={value} value={value}>{t(`appearance.mode.${value}`)}</option>)}
          </select>
        </label>
        <label>
          {t('appearance.density')}
          <select value={appearance.density} onChange={(e) => update('density', e.target.value as DensityId)}>
            {DENSITIES.map((value) => <option key={value} value={value}>{t(`appearance.density.${value}`)}</option>)}
          </select>
        </label>
        <label>
          {t('appearance.radius')}
          <select value={appearance.radius} onChange={(e) => update('radius', e.target.value as RadiusId)}>
            {RADII.map((value) => <option key={value} value={value}>{t(`appearance.radius.${value}`)}</option>)}
          </select>
        </label>
        <label>
          {t('appearance.motion')}
          <select value={appearance.motion} onChange={(e) => update('motion', e.target.value as MotionId)}>
            {MOTIONS.map((value) => <option key={value} value={value}>{t(`appearance.motion.${value}`)}</option>)}
          </select>
        </label>
        <label>
          {t('appearance.material')}
          <select value={appearance.material} onChange={(e) => {
            const material = e.target.value as MaterialId;
            setAppearance({
              ...appearance,
              material,
              glass: material === 'glass',
              glassStrength: material === 'glass'
                ? (appearance.glassStrength === 'off' ? 'soft' : appearance.glassStrength)
                : 'off'
            });
          }}>
            {MATERIALS.map((value) => <option key={value} value={value}>{t(`appearance.material.${value}`)}</option>)}
          </select>
        </label>
        <label>
          {t('appearance.glassStrength')}
          <select value={appearance.glassStrength} onChange={(e) => {
            const value = e.target.value as GlassStrengthId;
            setAppearance({
              ...appearance,
              glassStrength: value,
              glass: value !== 'off',
              material: value === 'off' ? 'solid' : 'glass'
            });
          }}>
            {GLASS.map((value) => <option key={value} value={value}>{t(`appearance.glassStrength.${value}`)}</option>)}
          </select>
        </label>
        <label>
          {t('appearance.glow')}
          <select value={appearance.glow} onChange={(e) => update('glow', e.target.value as GlowId)}>
            {GLOWS.map((value) => <option key={value} value={value}>{t(`appearance.glow.${value}`)}</option>)}
          </select>
        </label>
        <label>
          {t('appearance.gradient')}
          <select value={appearance.gradient} onChange={(e) => update('gradient', e.target.value as GradientId)}>
            {GRADIENTS.map((value) => <option key={value} value={value}>{t(`appearance.gradient.${value}`)}</option>)}
          </select>
        </label>
        <label>
          {t('appearance.contrast')}
          <select value={appearance.contrast} onChange={(e) => update('contrast', e.target.value as ContrastId)}>
            {CONTRASTS.map((value) => <option key={value} value={value}>{t(`appearance.contrast.${value}`)}</option>)}
          </select>
        </label>
        <label>
          {t('appearance.visualFx')}
          <select value={appearance.visualFx} onChange={(e) => update('visualFx', e.target.value as VisualFxId)}>
            {VISUAL_FX.map((value) => <option key={value} value={value}>{t(`appearance.visualFx.${value}`)}</option>)}
          </select>
        </label>
      </div>

      <div className="accent-picker visual31-accent-studio" aria-label={t('appearance.accent')}>
        <span>{t('appearance.accent')}</span>
        <div className="accent-picker__swatches">
          {ACCENTS.map((accent) => (
            <button
              key={accent}
              type="button"
              className={`accent-swatch accent-swatch--${accent}${appearance.accent === accent ? ' is-selected' : ''}`}
              aria-label={t(`appearance.accent.${accent}`)}
              aria-pressed={appearance.accent === accent}
              onClick={() => update('accent', accent)}
            >
              {appearance.accent === accent && <Check size={14} />}
            </button>
          ))}
        </div>
      </div>

      <div className="appearance-toggles">
        <label className="check-row">
          <input type="checkbox" checked={appearance.animations} onChange={(e) => update('animations', e.target.checked)} />
          {t('appearance.animations')}
        </label>
        <label className="check-row">
          <input type="checkbox" checked={appearance.backgroundArt} onChange={(e) => update('backgroundArt', e.target.checked)} />
          {t('appearance.backgroundArt')}
        </label>
      </div>

      {customTheme && (
        <section className="custom-theme-editor" aria-label={t('appearance.custom.title')}>
          <div className="custom-theme-editor__heading">
            <div>
              <p className="eyebrow">{t('appearance.custom.eyebrow')}</p>
              <h3>{t('appearance.custom.title')}</h3>
              <p>{t('appearance.custom.description')}</p>
            </div>

            <label className="custom-theme-name">
              {t('appearance.custom.name')}
              <input
                type="text"
                maxLength={64}
                value={customTheme.name}
                onChange={(event) => renameCustomTheme(event.target.value)}
              />
            </label>
          </div>

          <div className="custom-theme-editor__section">
            <div className="custom-theme-editor__section-title">
              <strong>{t('appearance.custom.colorsTitle')}</strong>
              <span>{t('appearance.custom.colorsHelp')}</span>
            </div>

            <div className="custom-theme-color-grid">
              {CUSTOM_COLOR_TOKENS.map(({ token, labelKey, fallback }) => (
                <label className="custom-theme-color" key={token}>
                  <span>{t(labelKey)}</span>
                  <span className="custom-theme-color__control">
                    <input
                      type="color"
                      value={colorInputValue(customTheme.tokens[token], fallback)}
                      onChange={(event) => {
                        try {
                          updateCustomThemeToken(token, event.target.value);
                          setProfileStatus(t('appearance.custom.saved'));
                        } catch (error) {
                          setProfileStatus(
                            `${t('appearance.profile.error')}: ${
                              error instanceof Error ? error.message : String(error)
                            }`
                          );
                        }
                      }}
                    />
                    <code>{colorInputValue(customTheme.tokens[token], fallback)}</code>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="custom-theme-editor__section">
            <div className="custom-theme-editor__section-title">
              <strong>{t('appearance.custom.effectsTitle')}</strong>
              <span>{t('appearance.custom.effectsHelp')}</span>
            </div>

            <div className="visual-fx-picker">
              {VISUAL_FX.map((effect) => (
                <button
                  type="button"
                  key={effect}
                  className={`visual-fx-card visual-fx-card--${effect}${appearance.visualFx === effect ? ' is-selected' : ''}`}
                  aria-pressed={appearance.visualFx === effect}
                  onClick={() => update('visualFx', effect)}
                >
                  <span className="visual-fx-card__preview" aria-hidden="true" />
                  <strong>{t(`appearance.visualFx.${effect}`)}</strong>
                  <small>{t(`appearance.visualFxDescription.${effect}`)}</small>
                  {appearance.visualFx === effect && <Check size={16} />}
                </button>
              ))}
            </div>
          </div>

          <div className="custom-theme-effect-summary">
            <span>{t('appearance.custom.effectMixer')}</span>
            <b>{t(`appearance.material.${appearance.material}`)}</b>
            <b>{t(`appearance.glow.${appearance.glow}`)}</b>
            <b>{t(`appearance.gradient.${appearance.gradient}`)}</b>
            <b>{t(`appearance.visualFx.${appearance.visualFx}`)}</b>
          </div>
        </section>
      )}

      {customTheme && (
        <ThemeAdvancedEditor
          appearance={appearance}
          customTheme={customTheme}
          resolvedMode={resolvedMode}
          setAppearance={setAppearance}
          replaceCustomThemeTokens={replaceCustomThemeTokens}
          renameCustomTheme={renameCustomTheme}
        />
      )}

      <div className="theme-profile-tools">
        <button type="button" onClick={cloneTheme}>{t('appearance.profile.clone')}</button>
        <button type="button" onClick={() => void exportProfile()}>
          {isTauriRuntime() ? t('appearance.profile.copyJson') : t('appearance.profile.export')}
        </button>
        <button type="button" onClick={() => importRef.current?.click()}>{t('appearance.profile.import')}</button>
        {customTheme && (
          <button type="button" onClick={clearCustomTheme}>{t('appearance.profile.deleteCustom')}</button>
        )}
        <input
          ref={importRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={importProfile}
        />
      </div>

      {profileStatus && <p className="theme-profile-status" role="status">{profileStatus}</p>}

      <div className="notice">
        <Sparkles size={18} />
        <p>{t('appearance.helpV2')}</p>
      </div>
    </section>
  );
}
