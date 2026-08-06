import type {
  ReactNode
} from 'react';

import {
  Card
} from './Card';

export function MetricCard({
  label,
  value,
  icon,
  detail
}: {
  label: ReactNode;
  value: ReactNode;
  icon?: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <Card
      className="ds-metric-card"
    >
      {icon && (
        <div className="ds-metric-card__icon">
          {icon}
        </div>
      )}
      <div>
        <span className="ds-metric-card__label">
          {label}
        </span>
        <strong className="ds-metric-card__value">
          {value}
        </strong>
        {detail && (
          <small className="ds-metric-card__detail">
            {detail}
          </small>
        )}
      </div>
    </Card>
  );
}
