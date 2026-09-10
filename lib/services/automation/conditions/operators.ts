// ============================================================================
// Common Comparison Operators Layer
// Pure, deterministic evaluation without arbitrary expressions, eval, or SQL.
// ============================================================================

export interface StringOperatorOptions {
  caseSensitive?: boolean;
  wholeWord?: boolean;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalizes string for comparison: trims whitespace and applies Unicode NFC normalization.
 */
export function normalizeString(str: unknown, caseSensitive = false): string {
  if (str === null || str === undefined) return '';
  const s = String(str).normalize('NFC').trim();
  return caseSensitive ? s : s.toLowerCase();
}

/**
 * Evaluates string comparison operators.
 */
export function evaluateStringOperator(
  operator: string,
  actual: unknown,
  target: unknown,
  options: StringOperatorOptions = {}
): boolean {
  const op = String(operator || 'equals').toLowerCase().trim();
  const caseSensitive = Boolean(options.caseSensitive);
  const wholeWord = Boolean(options.wholeWord);

  if (op === 'exists') {
    return actual !== null && actual !== undefined && String(actual).trim().length > 0;
  }
  if (op === 'not_exists') {
    return actual === null || actual === undefined || String(actual).trim().length === 0;
  }

  const act = normalizeString(actual, caseSensitive);
  const tgt = normalizeString(target, caseSensitive);

  if (wholeWord) {
    const rawActual = String(actual || '').normalize('NFC').trim();
    const regex = new RegExp(`\\b${escapeRegExp(String(target || '').normalize('NFC').trim())}\\b`, caseSensitive ? '' : 'i');
    const matched = regex.test(rawActual);
    if (op === 'contains') return matched;
    if (op === 'not_contains') return !matched;
  }

  switch (op) {
    case 'equals':
      return act === tgt;
    case 'not_equals':
      return act !== tgt;
    case 'contains':
      return act.includes(tgt);
    case 'not_contains':
      return !act.includes(tgt);
    case 'starts_with':
      return act.startsWith(tgt);
    case 'ends_with':
      return act.endsWith(tgt);
    case 'regex': {
      try {
        const regex = new RegExp(String(target || ''), caseSensitive ? '' : 'i');
        return regex.test(String(actual || ''));
      } catch {
        return false;
      }
    }
    default:
      return false;
  }
}

/**
 * Evaluates numeric comparison operators with strict type checking.
 */
export function evaluateNumericOperator(
  operator: string,
  actual: unknown,
  target: unknown
): boolean {
  const op = String(operator || 'equals').toLowerCase().trim();

  if (op === 'exists') {
    return actual !== null && actual !== undefined && typeof actual === 'number' && !isNaN(actual);
  }
  if (op === 'not_exists') {
    return actual === null || actual === undefined || (typeof actual === 'number' && isNaN(actual));
  }

  // Type safety check: do not coerce non-numeric strings unless they are purely numeric
  const numActual = typeof actual === 'number' ? actual : Number(actual);
  const numTarget = typeof target === 'number' ? target : Number(target);

  if (isNaN(numActual) || isNaN(numTarget)) {
    return false;
  }

  switch (op) {
    case 'equals':
      return numActual === numTarget;
    case 'not_equals':
      return numActual !== numTarget;
    case 'greater_than':
      return numActual > numTarget;
    case 'greater_than_or_equal':
      return numActual >= numTarget;
    case 'less_than':
      return numActual < numTarget;
    case 'less_than_or_equal':
      return numActual <= numTarget;
    default:
      return false;
  }
}

/**
 * Evaluates date comparison operators.
 */
export function evaluateDateOperator(
  operator: string,
  actual: unknown,
  target: unknown
): boolean {
  const op = String(operator || 'equals').toLowerCase().trim();

  if (op === 'exists') {
    return actual !== null && actual !== undefined && !isNaN(new Date(String(actual)).getTime());
  }
  if (op === 'not_exists') {
    return actual === null || actual === undefined || isNaN(new Date(String(actual)).getTime());
  }

  const dActual = new Date(String(actual)).getTime();
  const dTarget = new Date(String(target)).getTime();

  if (isNaN(dActual) || isNaN(dTarget)) {
    return false;
  }

  switch (op) {
    case 'equals':
      return dActual === dTarget;
    case 'not_equals':
      return dActual !== dTarget;
    case 'before':
    case 'less_than':
      return dActual < dTarget;
    case 'before_or_equal':
    case 'less_than_or_equal':
      return dActual <= dTarget;
    case 'after':
    case 'greater_than':
      return dActual > dTarget;
    case 'after_or_equal':
    case 'greater_than_or_equal':
      return dActual >= dTarget;
    default:
      return false;
  }
}

/**
 * Evaluates boolean comparison operators.
 */
export function evaluateBooleanOperator(
  operator: string,
  actual: unknown,
  target: unknown
): boolean {
  const op = String(operator || 'equals').toLowerCase().trim();

  const boolActual = Boolean(actual);
  const boolTarget = typeof target === 'string' ? target.toLowerCase() === 'true' : Boolean(target);

  switch (op) {
    case 'equals':
      return boolActual === boolTarget;
    case 'not_equals':
      return boolActual !== boolTarget;
    default:
      return false;
  }
}

/**
 * Evaluates array membership operators.
 */
export function evaluateArrayOperator(
  operator: string,
  actualList: unknown[],
  targetList: unknown[]
): boolean {
  const op = String(operator || 'matches_any').toLowerCase().trim();

  const actualNormalized = (actualList || []).map((v) => normalizeString(v, false));
  const targetNormalized = (targetList || []).map((v) => normalizeString(v, false)).filter(Boolean);

  if (targetNormalized.length === 0) {
    return false;
  }

  switch (op) {
    case 'matches_any':
    case 'has_any':
    case 'has':
    case 'contains':
      return targetNormalized.some((t) => actualNormalized.includes(t));

    case 'matches_all':
    case 'has_all':
    case 'contains_all':
      return targetNormalized.every((t) => actualNormalized.includes(t));

    case 'does_not_have':
    case 'not_contains':
      return !targetNormalized.some((t) => actualNormalized.includes(t));

    default:
      return false;
  }
}
