/**
 * BIP39 mnemonic phrase generation and key derivation
 * Enables user-friendly backup and recovery
 */

import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { ed25519 } from '@noble/curves/ed25519';
import { bytesToHex } from '@noble/hashes/utils';

/**
 * Generate a 24-word BIP39 mnemonic phrase
 *
 * @returns 24-word mnemonic phrase
 */
export function generateMnemonicPhrase(): string {
  // 256 bits of entropy = 24 words
  return generateMnemonic(wordlist, 256);
}

/**
 * Validate a mnemonic phrase
 *
 * @param mnemonic - Mnemonic phrase to validate
 * @returns true if valid
 */
export function isValidMnemonic(mnemonic: string): boolean {
  return validateMnemonic(mnemonic, wordlist);
}

/**
 * Derive an Ed25519 key pair from a mnemonic phrase
 *
 * @param mnemonic - BIP39 mnemonic phrase
 * @param passphrase - Optional BIP39 passphrase (additional security)
 * @returns Ed25519 key pair
 */
export function mnemonicToKeyPair(
  mnemonic: string,
  passphrase: string = ''
): { publicKey: Uint8Array; privateKey: Uint8Array } {
  if (!isValidMnemonic(mnemonic)) {
    throw new Error('Invalid mnemonic phrase');
  }

  // Convert mnemonic to seed (512 bits)
  const seed = mnemonicToSeedSync(mnemonic, passphrase);

  // Use first 32 bytes as Ed25519 private key
  const privateKey = seed.slice(0, 32);
  const publicKey = ed25519.getPublicKey(privateKey);

  return {
    publicKey,
    privateKey
  };
}

/**
 * Format mnemonic for display (4 words per line, numbered)
 *
 * @param mnemonic - Mnemonic phrase
 * @returns Formatted mnemonic for display
 */
export function formatMnemonicForDisplay(mnemonic: string): string {
  const words = mnemonic.split(' ');
  const lines: string[] = [];

  for (let i = 0; i < words.length; i += 4) {
    const lineWords = words.slice(i, i + 4);
    const numbered = lineWords.map((word, j) => `${i + j + 1}. ${word}`).join('  ');
    lines.push(numbered);
  }

  return lines.join('\n');
}

/**
 * Generate a recovery phrase for display and backup
 *
 * @returns Object with mnemonic and formatted display
 */
export function generateRecoveryPhrase(): {
  mnemonic: string;
  formatted: string;
} {
  const mnemonic = generateMnemonicPhrase();
  const formatted = formatMnemonicForDisplay(mnemonic);

  return {
    mnemonic,
    formatted
  };
}
