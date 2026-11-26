/**
 * Error Detection Engine: IEEE 802.3 Ethernet CRC32, Even/Odd Parity & RFC 1071 IPv4 Checksum
 * Pure functional bit-level and polynomial division operations.
 */

import { Crc32Result, CrcStep, ParityResult, ParityType } from '../types/network';
import { padBinary } from './functional';

// IEEE 802.3 reversed generator polynomial: 0xEDB88320 (normal: 0x04C11DB7)
export const IEEE_802_3_POLY_REVERSED = 0xedb88320;
export const IEEE_802_3_POLY_NORMAL_HEX = '0x04C11DB7';

// Precomputed 256-entry IEEE 802.3 CRC32 lookup table
const CRC32_TABLE: ReadonlyArray<number> = (() => {
  const table: number[] = new Array(256);
  for (let i = 0; i < 256; i++) {
    let crc = i;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 1) !== 0 ? (crc >>> 1) ^ IEEE_802_3_POLY_REVERSED : crc >>> 1;
    }
    table[i] = crc >>> 0;
  }
  return table;
})();

export const asciiToBinary = (text: string): string => {
  if (!text) return '';
  return Array.from(text)
    .map(ch => padBinary(ch.charCodeAt(0) & 0xff, 8))
    .join('');
};

export const asciiToHex = (text: string): string => {
  if (!text) return '0x00';
  return (
    '0x' +
    Array.from(text)
      .map(ch => (ch.charCodeAt(0) & 0xff).toString(16).toUpperCase().padStart(2, '0'))
      .join('')
  );
};

/**
 * Calculates standard IEEE 802.3 CRC32 with step-by-step byte trace
 * Standard test vector: calculateCrc32("123456789").crc32Hex === "0xCBF43926"
 */
export const calculateCrc32 = (inputAscii: string, corruptedBits: number[] = []): Crc32Result => {
  if (inputAscii.length === 0) {
    return {
      inputAscii: '',
      inputBinary: '',
      inputHex: '0x00',
      polynomialHex: IEEE_802_3_POLY_NORMAL_HEX,
      crc32Hex: '0x00000000',
      crc32Binary: '0'.repeat(32),
      crc32Int: 0,
      isValid: true,
      byteSteps: [],
    };
  }

  let rawBinary = asciiToBinary(inputAscii);
  if (corruptedBits.length > 0) {
    rawBinary = injectBitFlips(rawBinary, corruptedBits);
  }

  // Reconstruct byte array from (possibly flipped) binary stream
  const bytes: number[] = [];
  for (let i = 0; i < rawBinary.length; i += 8) {
    const byteSlice = rawBinary.slice(i, i + 8);
    bytes.push(parseInt(byteSlice.padEnd(8, '0'), 2) & 0xff);
  }

  let crc = 0xffffffff;
  const byteSteps: CrcStep[] = [];

  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    const beforeHex = '0x' + (crc >>> 0).toString(16).toUpperCase().padStart(8, '0');
    const lookupIdx = (crc ^ b) & 0xff;
    const polyApplied = (lookupIdx & 1) !== 0;
    crc = (crc >>> 8) ^ CRC32_TABLE[lookupIdx];
    const afterHex = '0x' + (crc >>> 0).toString(16).toUpperCase().padStart(8, '0');

    byteSteps.push({
      step: i + 1,
      byteIndex: i,
      byteHex: '0x' + b.toString(16).toUpperCase().padStart(2, '0'),
      crcBeforeHex: beforeHex,
      crcAfterHex: afterHex,
      polynomialApplied: polyApplied,
    });
  }

  const finalCrc = (crc ^ 0xffffffff) >>> 0;
  const crc32Hex = '0x' + finalCrc.toString(16).toUpperCase().padStart(8, '0');
  const crc32Binary = padBinary(finalCrc, 32);

  // Check against uncorrupted reference
  const cleanRef = corruptedBits.length > 0 ? calculateCrc32(inputAscii, []) : null;
  const isValid = cleanRef ? cleanRef.crc32Hex === crc32Hex : true;

  return {
    inputAscii,
    inputBinary: rawBinary,
    inputHex: asciiToHex(inputAscii),
    polynomialHex: IEEE_802_3_POLY_NORMAL_HEX,
    crc32Hex,
    crc32Binary,
    crc32Int: finalCrc,
    isValid,
    byteSteps,
  };
};

/**
 * Injects bit flips at specified 0-based indices
 */
export const injectBitFlips = (binaryStr: string, flipIndices: number[]): string => {
  if (!binaryStr || flipIndices.length === 0) return binaryStr;
  const flipSet = new Set(flipIndices);
  return Array.from(binaryStr)
    .map((bit, idx) => (flipSet.has(idx) ? (bit === '1' ? '0' : '1') : bit))
    .join('');
};

/**
 * Calculates Even and Odd Parity for a binary bit string
 */
export const calculateParity = (binaryInput: string): ParityResult => {
  const cleanBits = binaryInput.replace(/[^01]/g, '') || '0';
  const onesCount = Array.from(cleanBits).filter(b => b === '1').length;

  // Even parity bit ensures total number of 1s (including parity bit) is even
  const evenParityBit: '0' | '1' = onesCount % 2 === 0 ? '0' : '1';
  // Odd parity bit ensures total number of 1s (including parity bit) is odd
  const oddParityBit: '0' | '1' = onesCount % 2 === 0 ? '1' : '0';

  const encodedEven = cleanBits + evenParityBit;
  const encodedOdd = cleanBits + oddParityBit;

  const totalEvenOnes = Array.from(encodedEven).filter(b => b === '1').length;
  const totalOddOnes = Array.from(encodedOdd).filter(b => b === '1').length;

  return {
    inputBinary: cleanBits,
    onesCount,
    evenParityBit,
    oddParityBit,
    encodedEven,
    encodedOdd,
    isValidEven: totalEvenOnes % 2 === 0,
    isValidOdd: totalOddOnes % 2 === 1,
  };
};

/**
 * Verifies whether an encoded parity block passes parity check
 * Note: 1-bit flip is detected, 2-bit flip goes undetected (limitation of single parity bit)
 */
export const verifyParityCodeword = (codeword: string, parityType: ParityType): boolean => {
  if (parityType === 'none') return true;
  const ones = Array.from(codeword).filter(b => b === '1').length;
  return parityType === 'even' ? ones % 2 === 0 : ones % 2 === 1;
};

/**
 * Calculates RFC 1071 16-bit one's complement Internet Checksum (used in IPv4, TCP, UDP headers)
 */
export const calculateInternetChecksum = (bytes: number[]): string => {
  let sum = 0;
  for (let i = 0; i < bytes.length; i += 2) {
    const word = ((bytes[i] & 0xff) << 8) | ((bytes[i + 1] ?? 0) & 0xff);
    sum += word;
    while (sum > 0xffff) {
      sum = (sum & 0xffff) + (sum >>> 16);
    }
  }
  const complement = (~sum) & 0xffff;
  return '0x' + complement.toString(16).toUpperCase().padStart(4, '0');
};
