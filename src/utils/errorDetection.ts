/**
 * Pure Functional Algorithms for Error Detection:
 * - CRC32 (IEEE 802.3 Ethernet standard)
 * - Bit de Parité (Paire / Impaire)
 * - Internet Checksum (RFC 1071 / IPv4 & TCP)
 */

import { ParityResult, Crc32Result, CrcStep } from '../types/network';
import { stringToBytes, byteToBinary, countOnes, toHex32 } from './functional';

/**
 * Precomputed CRC32 Table for standard IEEE 802.3 polynomial (0xEDB88320)
 */
const CRC32_POLYNOMIAL = 0xEDB88320;

export const makeCrc32Table = (): number[] => {
  const table: number[] = new Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      if ((c & 1) !== 0) {
        c = (c >>> 1) ^ CRC32_POLYNOMIAL;
      } else {
        c = c >>> 1;
      }
    }
    table[i] = c >>> 0;
  }
  return table;
};

const CRC32_TABLE = makeCrc32Table();

/**
 * Pure functional calculation of CRC32 over arbitrary bytes array
 */
export const calculateCrc32Bytes = (bytes: number[]): number => {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i] & 0xff;
    const tableIndex = (crc ^ byte) & 0xff;
    crc = (crc >>> 8) ^ CRC32_TABLE[tableIndex];
  }
  return (crc ^ 0xffffffff) >>> 0;
};

/**
 * Calculate CRC32 for a string input with rich diagnostic metadata
 */
export const calculateCrc32 = (input: string): Crc32Result => {
  const bytes = stringToBytes(input);
  const crcInt = calculateCrc32Bytes(bytes);
  const crcHex = toHex32(crcInt);
  const crc32Binary = (crcInt >>> 0).toString(2).padStart(32, '0');
  const inputBinary = bytes.map(b => byteToBinary(b)).join(' ');
  const inputHex = bytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');

  return {
    inputAscii: input,
    inputBinary,
    inputHex,
    polynomialHex: '0xEDB88320 (IEEE 802.3 Ethernet)',
    crc32Hex: crcHex,
    crc32Binary,
    crc32Int: crcInt,
    isValid: true,
    detailedStepsCount: bytes.length * 8,
  };
};

/**
 * Generate step-by-step bitwise CRC division for visual education
 * (Uses simplified 8-bit / 16-bit generator polynomial for clear visual rendering)
 */
export const generateCrcToySteps = (inputBinary: string, generatorBinary: string = '10011'): {
  readonly steps: CrcStep[];
  readonly finalRemainder: string;
} => {
  const genLen = generatorBinary.length;
  // Pad data with (genLen - 1) zeros
  const paddedInput = inputBinary.replace(/\s+/g, '') + '0'.repeat(genLen - 1);
  const steps: CrcStep[] = [];
  
  let currentRemainder = paddedInput.slice(0, genLen);
  let pointer = genLen;

  while (pointer <= paddedInput.length) {
    const isLeadingOne = currentRemainder[0] === '1';
    const quotientBit = isLeadingOne ? '1' : '0';
    
    // XOR with generator if leading bit is 1, else XOR with 0
    let xorResult = '';
    if (isLeadingOne) {
      for (let i = 0; i < genLen; i++) {
        xorResult += currentRemainder[i] === generatorBinary[i] ? '0' : '1';
      }
    } else {
      xorResult = currentRemainder;
    }

    // Drop leading bit and pull down next bit
    const nextBit = pointer < paddedInput.length ? paddedInput[pointer] : '';
    const newRemainder = xorResult.slice(1) + (nextBit !== '' ? nextBit : '');

    steps.push({
      step: steps.length + 1,
      remainderBinary: currentRemainder,
      currentBit: nextBit,
      quotientBit,
      xorApplied: isLeadingOne,
    });

    currentRemainder = newRemainder;
    pointer++;
  }

  return {
    steps: steps.slice(0, 30), // limit to first 30 steps for UI performance
    finalRemainder: currentRemainder.slice(0, genLen - 1),
  };
};

/**
 * Pure calculation of Parity bit (Even & Odd)
 */
export const calculateParity = (binaryInput: string): ParityResult => {
  const cleanBinary = binaryInput.replace(/[^01]/g, '');
  const ones = countOnes(cleanBinary);
  
  // Parité Paire (Even): total de '1' doit être pair.
  // Si ones est impair, on met 1, sinon 0.
  const evenBit: '0' | '1' = ones % 2 === 0 ? '0' : '1';

  // Parité Impaire (Odd): total de '1' doit être impair.
  // Si ones est pair, on met 1, sinon 0.
  const oddBit: '0' | '1' = ones % 2 === 0 ? '1' : '0';

  const encodedEven = cleanBinary + evenBit;
  const encodedOdd = cleanBinary + oddBit;

  // Validation
  const isValidEven = countOnes(encodedEven) % 2 === 0;
  const isValidOdd = countOnes(encodedOdd) % 2 === 1;

  return {
    inputBinary: cleanBinary,
    onesCount: ones,
    evenParityBit: evenBit,
    oddParityBit: oddBit,
    encodedEven,
    encodedOdd,
    isValidEven,
    isValidOdd,
  };
};

/**
 * Check parity on a received stream with trailing parity bit
 */
export const verifyParityStream = (
  stream: string,
  parityType: 'even' | 'odd'
): { isValid: boolean; onesCount: number; expectedParity: string; actualParity: string } => {
  const clean = stream.replace(/[^01]/g, '');
  if (clean.length === 0) {
    return { isValid: false, onesCount: 0, expectedParity: '0', actualParity: '0' };
  }
  const dataBits = clean.slice(0, -1);
  const actualParity = clean.slice(-1);
  const ones = countOnes(dataBits);

  const expectedParity = parityType === 'even'
    ? (ones % 2 === 0 ? '0' : '1')
    : (ones % 2 === 0 ? '1' : '0');

  return {
    isValid: actualParity === expectedParity,
    onesCount: ones,
    expectedParity,
    actualParity,
  };
};

/**
 * RFC 1071 Internet Checksum (One's complement 16-bit sum)
 * Used in IPv4 headers, TCP, and UDP
 */
export const calculateInternetChecksum = (bytes: number[]): number => {
  let sum = 0;
  const length = bytes.length;

  // Sum 16-bit words
  for (let i = 0; i < length - 1; i += 2) {
    const word = ((bytes[i] & 0xff) << 8) | (bytes[i + 1] & 0xff);
    sum += word;
  }

  // If odd length, pad with trailing 0
  if (length % 2 === 1) {
    sum += (bytes[length - 1] & 0xff) << 8;
  }

  // Fold 32-bit sum to 16 bits (carry addition)
  while ((sum >>> 16) > 0) {
    sum = (sum & 0xffff) + (sum >>> 16);
  }

  // Invert (One's complement)
  return (~sum & 0xffff) >>> 0;
};

/**
 * Inject random bit errors or specific bit flips for simulation
 */
export const injectBitFlips = (binaryString: string, flipIndices: number[]): string => {
  const bits = binaryString.split('');
  flipIndices.forEach(idx => {
    if (idx >= 0 && idx < bits.length && (bits[idx] === '0' || bits[idx] === '1')) {
      bits[idx] = bits[idx] === '0' ? '1' : '0';
    }
  });
  return bits.join('');
};
