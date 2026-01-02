/**
 * Wallet types and interfaces
 */

import type { Chain } from './chain';

export interface Wallet {
  /** Unique identifier */
  id: string;

  /** User-defined name */
  name: string;

  /** Primary blockchain */
  chain: Chain;

  /** Wallet type */
  type: WalletType;

  /** Creation timestamp */
  createdAt: number;

  /** Last updated timestamp */
  updatedAt: number;

  /** Addresses associated with this wallet */
  addresses: WalletAddress[];

  /** Wallet metadata */
  metadata?: WalletMetadata;
}

export enum WalletType {
  /** Full HD wallet with seed phrase */
  HD = 'hd',
  /** Imported private key */
  PrivateKey = 'private_key',
  /** Watch-only address */
  WatchOnly = 'watch_only',
  /** Hardware wallet */
  Hardware = 'hardware',
}

export interface WalletAddress {
  /** The address string */
  address: string;

  /** Chain this address is on */
  chain: Chain;

  /** Derivation path (for HD wallets) */
  derivationPath?: string;

  /** Address label */
  label?: string;

  /** Is this the primary address? */
  isPrimary: boolean;
}

export interface WalletMetadata {
  /** For HD wallets: fingerprint of master key */
  fingerprint?: string;

  /** For HD wallets: xpub/ypub/zpub */
  extendedPublicKey?: string;

  /** For hardware wallets: device type */
  hardwareType?: 'ledger' | 'trezor' | 'coldcard';

  /** Custom user notes */
  notes?: string;

  /** Tags for organization */
  tags?: string[];
}

/**
 * Wallet balance information
 */
export interface WalletBalance {
  /** Wallet ID */
  walletId: string;

  /** Chain */
  chain: Chain;

  /** Native currency balance (in smallest unit as string) */
  nativeBalance: string;

  /** Native currency balance formatted */
  nativeBalanceFormatted: string;

  /** Token balances */
  tokens: TokenBalance[];

  /** Total value in fiat */
  totalFiatValue?: string;

  /** Fiat currency */
  fiatCurrency?: string;

  /** Last synced timestamp */
  lastSynced: number;
}

export interface TokenBalance {
  /** Token contract address */
  contractAddress: string;

  /** Token symbol */
  symbol: string;

  /** Token name */
  name: string;

  /** Token decimals */
  decimals: number;

  /** Balance in smallest unit */
  balance: string;

  /** Balance formatted */
  balanceFormatted: string;

  /** Fiat value */
  fiatValue?: string;

  /** Token logo URL */
  logoUrl?: string;
}

/**
 * Wallet creation request
 */
export interface CreateWalletRequest {
  name: string;
  type: WalletType;
  chain: Chain;

  /** For HD wallets: optional mnemonic to import */
  mnemonic?: string;

  /** For private key import */
  privateKey?: string;

  /** For watch-only: address to watch */
  address?: string;

  /** Optional password for encryption */
  password?: string;
}

/**
 * Wallet export data (for backup)
 */
export interface WalletExport {
  version: number;
  exportedAt: number;
  wallet: Omit<Wallet, 'id' | 'createdAt' | 'updatedAt'>;

  /** Encrypted mnemonic (if HD wallet) */
  encryptedMnemonic?: string;

  /** Encrypted private keys */
  encryptedKeys?: string;
}
