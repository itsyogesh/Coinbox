/**
 * Wallet types and interfaces
 */
export var WalletType;
(function (WalletType) {
    /** Full HD wallet with seed phrase */
    WalletType["HD"] = "hd";
    /** Imported private key */
    WalletType["PrivateKey"] = "private_key";
    /** Watch-only address */
    WalletType["WatchOnly"] = "watch_only";
    /** Hardware wallet */
    WalletType["Hardware"] = "hardware";
})(WalletType || (WalletType = {}));
//# sourceMappingURL=wallet.js.map