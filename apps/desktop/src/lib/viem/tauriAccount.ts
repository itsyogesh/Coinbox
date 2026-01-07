/**
 * Tauri-backed Viem Account
 *
 * This creates a Viem Account that routes all signing operations
 * to the Rust backend via Tauri IPC. Private keys never leave Rust.
 *
 * Usage:
 * ```typescript
 * const account = createTauriAccount('0x...', { walletId: 'wallet-id-123' });
 * const walletClient = createWalletClient({
 *   account,
 *   chain: mainnet,
 *   transport: http(),
 * });
 *
 * // Sign and send transaction
 * const hash = await walletClient.sendTransaction({ to, value });
 * ```
 */

import {
  type Account,
  type Address,
  type Hex,
  type LocalAccount,
  type SignableMessage,
  keccak256,
  serializeTransaction,
  type TransactionSerializable,
  hashTypedData,
  toHex,
} from "viem";
import {
  signEthereumMessage,
  signEthereumTransactionHash,
  signEthereumTypedData,
} from "../tauri/ethereum";

export interface TauriAccountOptions {
  /** Wallet ID in the backend */
  walletId: string;
  /** BIP44 account index (default: 0) */
  accountIndex?: number;
  /** BIP44 address index (default: 0) */
  addressIndex?: number;
}

/**
 * Create a Viem Account backed by Tauri signing
 *
 * This account can be used with Viem's wallet client to sign
 * messages, typed data, and transactions. All signing is done
 * in the Rust backend - keys never touch JavaScript.
 *
 * @param address - The Ethereum address for this account
 * @param options - Configuration options
 */
export function createTauriAccount(
  address: Address,
  options: TauriAccountOptions
): LocalAccount {
  const { walletId, accountIndex = 0, addressIndex = 0 } = options;

  const account: LocalAccount = {
    address,
    type: "local",
    publicKey: "0x" as Hex, // Not needed for signing operations
    source: "custom",

    // Sign a personal message (EIP-191)
    async signMessage({
      message,
    }: {
      message: SignableMessage;
    }): Promise<Hex> {
      // Convert message to string
      let messageStr: string;
      if (typeof message === "string") {
        messageStr = message;
      } else if (typeof message === "object" && "raw" in message) {
        const raw = message.raw;
        messageStr =
          typeof raw === "string"
            ? raw
            : toHex(raw as Uint8Array);
      } else {
        // It's a Uint8Array
        messageStr = toHex(message as Uint8Array);
      }

      const result = await signEthereumMessage(
        walletId,
        messageStr,
        accountIndex,
        addressIndex
      );

      return result.signature as Hex;
    },

    // Sign typed data (EIP-712)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async signTypedData(typedData: any): Promise<Hex> {
      // Compute EIP-712 hash using Viem
      const hash = hashTypedData(typedData);

      const result = await signEthereumTypedData(
        walletId,
        hash,
        accountIndex,
        addressIndex
      );

      return result.signature as Hex;
    },

    // Sign a transaction
    async signTransaction(
      transaction: TransactionSerializable
    ): Promise<Hex> {
      // Serialize the unsigned transaction
      const serialized = serializeTransaction(transaction);

      // Hash the serialized transaction
      const hash = keccak256(serialized);

      // Sign the hash in Rust
      const signature = await signEthereumTransactionHash(
        walletId,
        hash,
        accountIndex,
        addressIndex
      );

      // Reconstruct the signed transaction
      // The signature contains r, s, v which we need to append
      const signedTx = serializeTransaction(transaction, {
        r: signature.r as Hex,
        s: signature.s as Hex,
        v: BigInt(signature.v),
      });

      return signedTx;
    },
  };

  return account;
}

/**
 * Type guard to check if an account is a Tauri account
 */
export function isTauriAccount(account: Account): boolean {
  return account.type === "local" && (account as LocalAccount).source === "custom";
}
