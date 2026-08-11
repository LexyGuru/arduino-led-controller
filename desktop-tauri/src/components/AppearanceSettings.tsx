import {
  Moon,
  Palette,
  Sparkles,
  Sun
} from 'lucide-react';

import {
  useTheme
} from '../design-system/ThemeProvider';

import type {
  AccentId,
  AppearanceMode,
  DensityId,
  RadiusId,
  ThemeId
} from '../design-system/theme-types';

import {
  useI18n
} from '../i18n';

const MODES:
  AppearanceMode[] = [
    'system',
    'light',
    'dark'
  ];

const THEMES:
  ThemeId[] = [
    'arctic',
    'midnight'
  ];

const ACCENTS:
  AccentId[] = [
    'blue',
    'cyan',
    'green',
    'purple',
    'pink',
    'orange',
    'red'
  ];

const DENSITIES:
  DensityId[] = [
    'compact',
    'comfortable',
    'touch'
  ];

const RADII:
  RadiusId[] = [
    'square',
    'rounded',
    'extra-rounded'
  ];

export function AppearanceSettings() {
  const { t } =
    useI18n();

  const {
    appearance,
    setAppearance,
    resolvedMode
  } =
    useTheme();

  const update =
    <K extends keyof typeof appearance>(
      key: K,
      value:
        typeof appearance[K]
    ) =>
      setAppearance({
        ...appearance,
        [key]: value
      });

  return (
    <section
      className="panel settings-panel appearance-panel" data-mobile-theme-parity="full"
    >
      <div className="panel-title">
        <div>
          <p className="eyebrow">
            {t('appearance.eyebrow')}
          </p>
          <h2>
            {t('appearance.title')}
          </h2>
        </div>
        <Palette />
      </div>

      <div className="appearance-preview">
        <div>
          {resolvedMode === 'light'
            ? <Sun size={24} />
            : <Moon size={24} />}
          <strong>
            {t(
              `appearance.theme.${appearance.theme}`
            )}
          </strong>
          <span>
            {t(
              `appearance.mode.${appearance.mode}`
            )}
          </span>
        </div>
        <Sparkles size={24} />
      </div>

      <div className="settings-grid">
        <label>
          {t('appearance.mode')}
          <select
            value={appearance.mode}
            onChange={
              (event) =>
                update(
                  'mode',
                  event.target
                    .value as
                    AppearanceMode
                )
            }
          >
            {MODES.map(
              (mode) => (
                <option
                  key={mode}
                  value={mode}
                >
                  {t(
                    `appearance.mode.${mode}`
                  )}
                </option>
              )
            )}
          </select>
        </label>

        <label>
          {t('appearance.theme')}
          <select
            value={appearance.theme}
            onChange={
              (event) =>
                update(
                  'theme',
                  event.target
                    .value as
                    ThemeId
                )
            }
          >
            {THEMES.map(
              (theme) => (
                <option
                  key={theme}
                  value={theme}
                >
                  {t(
                    `appearance.theme.${theme}`
                  )}
                </option>
              )
            )}
          </select>
        </label>

        <label>
          {t('appearance.accent')}
          <select
            value={appearance.accent}
            onChange={
              (event) =>
                update(
                  'accent',
                  event.target
                    .value as
                    AccentId
                )
            }
          >
            {ACCENTS.map(
              (accent) => (
                <option
                  key={accent}
                  value={accent}
                >
                  {t(
                    `appearance.accent.${accent}`
                  )}
                </option>
              )
            )}
          </select>
        </label>

        <label>
          {t('appearance.density')}
          <select
            value={appearance.density}
            onChange={
              (event) =>
                update(
                  'density',
                  event.target
                    .value as
                    DensityId
                )
            }
          >
            {DENSITIES.map(
              (density) => (
                <option
                  key={density}
                  value={density}
                >
                  {t(
                    `appearance.density.${density}`
                  )}
                </option>
              )
            )}
          </select>
        </label>

        <label>
          {t('appearance.radius')}
          <select
            value={appearance.radius}
            onChange={
              (event) =>
                update(
                  'radius',
                  event.target
                    .value as
                    RadiusId
                )
            }
          >
            {RADII.map(
              (radius) => (
                <option
                  key={radius}
                  value={radius}
                >
                  {t(
                    `appearance.radius.${radius}`
                  )}
                </option>
              )
            )}
          </select>
        </label>
      </div>

      <label className="check-row">
        <input
          type="checkbox"
          checked={
            appearance.animations
          }
          onChange={
            (event) =>
              update(
                'animations',
                event.target.checked
              )
          }
        />
        {t('appearance.animations')}
      </label>

      <label className="check-row">
        <input
          type="checkbox"
          checked={
            appearance.glass
          }
          onChange={
            (event) =>
              update(
                'glass',
                event.target.checked
              )
          }
        />
        {t('appearance.glass')}
      </label>

      <div className="notice">
        <Sparkles size={18} />
        <p>
          {t('appearance.help')}
        </p>
      </div>
    </section>
  );
}
