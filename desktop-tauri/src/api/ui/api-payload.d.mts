export function unwrapApiPayload<T = unknown>(
  value: unknown
): T;

export interface ApiErrorView {
  code: string;
  message: string;
  status: number | null;
  details: Record<string, unknown> | null;
}

export function readApiError(
  error: unknown
): ApiErrorView;

export function asArray<T = unknown>(
  value: unknown
): T[];
