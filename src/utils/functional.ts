/**
 * Functional Programming Utilities & Byte/Binary Converters
 */

/**
 * Functional Pipe: passes output of one pure function to the next
 */
export const pipe = <T>(...fns: Array<(arg: T) => T>) => (initialValue: T): T =>
  fns.reduce((acc, fn) => fn(acc), initialValue);

/**
 * Functional Compose: right-to-left composition
 */
export const compose = <T>(...fns: Array<(arg: T) => T>) => (initialValue: T): T =>
  fns.reduceRight((acc, fn) => fn(acc), initialValue);

/**
 * String to ASCII Byte Array (pure)
 */
export const stringToBytes = (str: string): number[] =>
  Array.from(new TextEncoder().encode(str));

/**
 * Bytes to Hex string with spacing option
 */
export const bytesToHex = (bytes: number[], separator: string = ' '): string =>
  bytes.map(b => (b & 0xff).toString(16).padStart(2, '0').toUpperCase()).join(separator);

/**
 * Number to 32-bit Hex string (e.g. 0x1A2B3C4D)
 */
export const toHex32 = (num: number): string =>
  '0x' + ((num >>> 0).toString(16).padStart(8, '0').toUpperCase());

/**
 * Number to 16-bit Hex string (e.g. 0x0800)
 */
export const toHex16 = (num: number): string =>
  '0x' + ((num & 0xffff).toString(16).padStart(4, '0').toUpperCase());

/**
 * Byte to 8-bit binary string (e.g. "01001000")
 */
export const byteToBinary = (byte: number): string =>
  (byte & 0xff).toString(2).padStart(8, '0');

/**
 * Bytes array to binary string
 */
export const bytesToBinaryString = (bytes: number[]): string =>
  bytes.map(byteToBinary).join(' ');

/**
 * String to continuous binary string
 */
export const stringToBinary = (str: string): string =>
  stringToBytes(str).map(byteToBinary).join('');

/**
 * Format bits into 8-bit octet groups
 */
export const formatBitGroups = (bitStream: string, groupSize: number = 8): string[] => {
  const groups: string[] = [];
  for (let i = 0; i < bitStream.length; i += groupSize) {
    groups.push(bitStream.slice(i, i + groupSize));
  }
  return groups;
};

/**
 * Count the number of '1' bits in a binary string (Hamming weight)
 */
export const countOnes = (binaryStr: string): number =>
  binaryStr.split('').reduce((count, bit) => (bit === '1' ? count + 1 : count), 0);

/**
 * Format bytes into human readable French string (Ko, Mo, Go)
 */
export const formatBytesFr = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 Octets';
  const k = 1000;
  const sizes = ['Octets', 'Ko', 'Mo', 'Go', 'To'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
};

/**
 * Format binary bytes into IEC standard (Kio, Mio, Gio)
 */
export const formatBinaryBytesFr = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 Octets';
  const k = 1024;
  const sizes = ['Octets', 'Kio', 'Mio', 'Gio', 'Tio'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
};

/**
 * Format bitrates in French (bps, Kbps, Mbps, Gbps)
 */
export const formatBitrateFr = (bps: number, decimals: number = 2): string => {
  if (bps === 0) return '0 bps';
  if (bps >= 1_000_000_000) return `${(bps / 1_000_000_000).toFixed(decimals)} Gbps (Gbit/s)`;
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(decimals)} Mbps (Mbit/s)`;
  if (bps >= 1_000) return `${(bps / 1_000).toFixed(decimals)} Kbps (Kbit/s)`;
  return `${bps.toFixed(0)} bps (bit/s)`;
};

/**
 * Format duration in seconds to human readable (s, ms, min, heures)
 */
export const formatDurationFr = (seconds: number): string => {
  if (seconds < 0.001) return `${(seconds * 1_000_000).toFixed(1)} µs`;
  if (seconds < 1) return `${(seconds * 1_000).toFixed(2)} ms`;
  if (seconds < 60) return `${seconds.toFixed(2)} s`;
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(1);
  return `${mins} min ${secs} s`;
};
