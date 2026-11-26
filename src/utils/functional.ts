/**
 * Pure Functional Programming Utilities
 * Composition, Pipe, Currying, and Immutable Array/Object Helpers
 */

export const pipe = <T>(initialValue: T, ...fns: Array<(arg: T) => T>): T =>
  fns.reduce((acc, fn) => fn(acc), initialValue);

export const compose = <T>(...fns: Array<(arg: T) => T>) => (initialValue: T): T =>
  fns.reduceRight((acc, fn) => fn(acc), initialValue);

export const clamp = (val: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, val));

export const roundTo = (val: number, decimals = 2): number => {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
};

export const padBinary = (num: number, bits: number): string =>
  (num >>> 0).toString(2).padStart(bits, '0').slice(-bits);

export const toHex = (num: number, hexChars = 4): string =>
  '0x' + (num >>> 0).toString(16).toUpperCase().padStart(hexChars, '0');
