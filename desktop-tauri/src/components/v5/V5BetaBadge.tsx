import { Zap } from 'lucide-react';

interface V5BetaBadgeProps {
  version?: string | null;
  compact?: boolean;
}

export function V5BetaBadge({
  version,
  compact = false
}: V5BetaBadgeProps) {
  const isBeta =
    typeof version === 'string' &&
    /(?:^|[-.])beta(?:[.-]|$)/i.test(version);

  if (!isBeta) return null;

  return (
    <span
      title="V5 Beta build"
      aria-label="V5 Beta build"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: compact ? 4 : 6,
        marginInlineStart: compact ? 6 : 8,
        padding: compact ? '2px 7px' : '3px 9px',
        borderRadius: 999,
        border: '1px solid rgba(84, 210, 255, 0.52)',
        background:
          'linear-gradient(135deg, rgba(0, 229, 255, 0.16), rgba(49, 98, 255, 0.18) 48%, rgba(159, 72, 255, 0.2))',
        boxShadow:
          '0 0 12px rgba(72, 144, 255, 0.16), inset 0 0 8px rgba(134, 82, 255, 0.08)',
        color: 'var(--text-primary, #eaf8ff)',
        fontSize: compact ? 10 : 11,
        fontWeight: 800,
        letterSpacing: '0.12em',
        lineHeight: 1,
        verticalAlign: 'middle',
        whiteSpace: 'nowrap'
      }}
    >
      <Zap
        size={compact ? 11 : 12}
        strokeWidth={2.4}
        aria-hidden="true"
      />
      BETA
    </span>
  );
}
