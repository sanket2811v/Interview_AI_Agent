/**
 * Code Execution Output Comparator
 * Compares standard output against expected outputs adhering to competitive programming standards:
 * - Line-ending normalization (\r\n -> \n)
 * - Trailing whitespace removal per line and EOF
 * - Preserves significant internal whitespace and line structures
 */

/**
 * Normalizes output string for deterministic comparison
 * @param {string} str
 * @returns {string}
 */
export function normalizeOutput(str) {
  if (str === null || str === undefined) return '';
  const text = String(str);

  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trimEnd();
}

/**
 * Compares actual stdout against expected output
 * @param {string} actual
 * @param {string} expected
 * @returns {{ isMatch: boolean, actual: string, expected: string }}
 */
export function compareOutput(actual, expected) {
  const normActual = normalizeOutput(actual);
  const normExpected = normalizeOutput(expected);

  return {
    isMatch: normActual === normExpected,
    actual: normActual,
    expected: normExpected
  };
}

