'use strict';

function prometheusName(
  value
) {
  let name =
    String(value || '')
      .trim()
      .replace(
        /[^A-Za-z0-9_:]+/g,
        '_'
      )
      .replace(
        /^_+|_+$/g,
        ''
      );

  if (!name) {
    name =
      'unnamed_metric';
  }

  if (
    !/^[A-Za-z_:]/.test(
      name
    )
  ) {
    name =
      `metric_${name}`;
  }

  return name
    .toLowerCase();
}

function metricLine(
  name,
  value
) {
  const numeric =
    Number(value);

  return `${prometheusName(name)} ${Number.isFinite(numeric) ? numeric : 0}`;
}

function renderPrometheus(
  snapshot,
  {
    prefix =
      'arduino_led_controller'
  } = {}
) {
  const lines = [
    '# Arduino LED Controller metrics',
    '# TYPE arduino_led_controller_info gauge',
    `arduino_led_controller_info{service="arduino-led-controller"} 1`
  ];

  const counters =
    snapshot?.counters ||
    {};

  for (
    const [name, value]
    of Object.entries(counters)
  ) {
    const metric =
      `${prefix}_${name}`;

    lines.push(
      `# TYPE ${prometheusName(metric)} counter`
    );
    lines.push(
      metricLine(
        metric,
        value
      )
    );
  }

  const timings =
    snapshot?.timings ||
    {};

  for (
    const [name, value]
    of Object.entries(timings)
  ) {
    const metric =
      `${prefix}_${name}`;

    lines.push(
      `# TYPE ${prometheusName(metric)} summary`
    );
    lines.push(
      metricLine(
        `${metric}_count`,
        value.count
      )
    );
    lines.push(
      metricLine(
        `${metric}_sum_milliseconds`,
        value.totalMs
      )
    );
    lines.push(
      metricLine(
        `${metric}_minimum_milliseconds`,
        value.minimumMs ?? 0
      )
    );
    lines.push(
      metricLine(
        `${metric}_maximum_milliseconds`,
        value.maximumMs
      )
    );
    lines.push(
      metricLine(
        `${metric}_average_milliseconds`,
        value.averageMs
      )
    );
  }

  const generated =
    Date.parse(
      snapshot?.generatedAt || ''
    );

  if (
    Number.isFinite(generated)
  ) {
    lines.push(
      '# TYPE arduino_led_controller_metrics_generated_seconds gauge'
    );
    lines.push(
      `arduino_led_controller_metrics_generated_seconds ${generated / 1000}`
    );
  }

  return `${lines.join('\n')}\n`;
}

module.exports = {
  metricLine,
  prometheusName,
  renderPrometheus
};
