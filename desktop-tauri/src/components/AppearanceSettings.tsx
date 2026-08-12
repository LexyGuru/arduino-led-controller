import {
  Check,
  Moon,
  Palette,
  RotateCcw,
  Sparkles,
  Sun
} from 'lucide-react';

import { useTheme } from '../design-system/ThemeProvider';
import { THEME_CATALOG } from '../design-system/theme-catalog';
import {
  CORE_UI_VERSION,
  THEME_ENGINE_VERSION,
  type AccentId,
  type AppearanceMode,
  type DensityId,
  type GlassStrengthId,
  type GlowId,
  type MotionId,
  type RadiusId,
  type ThemeId
} from '../design-system/theme-types';
import { useI18n } from '../i18n';

const MODES: AppearanceMode[] = ['system', 'light', 'dark'];
const ACCENTS: AccentId[] = ['blue', 'cyan', 'green', 'purple', 'pink', 'orange', 'red'];
const DENSITIES: DensityId[] = ['compact', 'comfortable', 'touch'];
const RADII: RadiusId[] = ['square', 'rounded', 'extra-rounded'];
const MOTIONS: MotionId[] = ['reduced', 'balanced', 'expressive'];
const GLASS: GlassStrengthId[] = ['off', 'soft', 'strong'];
const GLOWS: GlowId[] = ['off', 'soft', 'strong'];

export function AppearanceSettings() {
  const { t } = useI18n();
  const { appearance, setAppearance, resetAppearance, resolvedMode } = useTheme();

  const update = <K extends keyof typeof appearance>(
    key: K,
    value: typeof appearance[K]
  ) => setAppearance({ ...appearance, [key]: value });

  const setTheme = (theme: ThemeId) => update('theme', theme);

  return (
    <section className="panel settings-panel appearance-panel theme-engine-v2" data-mobile-theme-parity="full">
      <div className="panel-title">
        <div>
          <p className="eyebrow">{t('appearance.eyebrow')}</p>
          <h2>{t('appearance.title')}</h2>
          <p className="theme-engine-version">
            Theme Engine {THEME_ENGINE_VERSION} · Core UI {CORE_UI_VERSION}
          </p>
        </div>
        <Palette />
      </div>

      <div className="appearance-preview theme-engine-hero">
        <div>
          {resolvedMode === 'light' ? <Sun size={24} /> : <Moon size={24} />}
          <strong>{t(`appearance.theme.${appearance.theme}`)}</strong>
          <span>{t(`appearance.mode.${appearance.mode}`)}</span>
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

      <div className="theme-gallery" role="list" aria-label={t('appearance.galleryTitle')}>
        {THEME_CATALOG.map((theme) => {
          const selected = appearance.theme === theme.id;
          return (
            <button
              type="button"
              role="listitem"
              key={theme.id}
              className={`theme-card theme-card--${theme.id}${selected ? ' is-selected' : ''}`}
              aria-pressed={selected}
              onClick={() => setTheme(theme.id)}
            >
              <span className="theme-card__visual" aria-hidden="true">
                <span className="theme-card__orb" />
                <span className="theme-card__panel" />
                <span className="theme-card__chart" />
              </span>
              <span className="theme-card__copy">
                <strong>{t(theme.nameKey)}</strong>
                <small>{t(theme.descriptionKey)}</small>
              </span>
              {selected && <Check className="theme-card__check" size={18} />}
            </button>
          );
        })}
      </div>

      <div className="appearance-control-grid">
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
          {t('appearance.glassStrength')}
          <select value={appearance.glassStrength} onChange={(e) => {
            const value = e.target.value as GlassStrengthId;
            setAppearance({ ...appearance, glassStrength: value, glass: value !== 'off' });
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
      </div>

      <div className="accent-picker" aria-label={t('appearance.accent')}>
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

      <div className="notice"><Sparkles size={18} /><p>{t('appearance.helpV2')}</p></div>
    </section>
  );
}
