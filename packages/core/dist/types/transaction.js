/**
 * Transaction types and interfaces
 */
export var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus["Pending"] = "pending";
    TransactionStatus["Confirmed"] = "confirmed";
    TransactionStatus["Failed"] = "failed";
    TransactionStatus["Dropped"] = "dropped";
})(TransactionStatus || (TransactionStatus = {}));
export var TransactionDirection;
(function (TransactionDirection) {
    TransactionDirection["Incoming"] = "incoming";
    TransactionDirection["Outgoing"] = "outgoing";
    TransactionDirection["SelfTransfer"] = "self";
    TransactionDirection["Swap"] = "swap";
    TransactionDirection["Contract"] = "contract";
})(TransactionDirection || (TransactionDirection = {}));
export var AssetType;
(function (AssetType) {
    AssetType["NativeCurrency"] = "native";
    AssetType["Token"] = "token";
    AssetType["NFT"] = "nft";
    AssetType["LP"] = "lp";
})(AssetType || (AssetType = {}));
export var TaxCategory;
(function (TaxCategory) {
    // Capital Gains Events
    TaxCategory["Sale"] = "sale";
    TaxCategory["Swap"] = "swap";
    TaxCategory["NFTSale"] = "nft_sale";
    TaxCategory["PaymentSent"] = "payment_sent";
    // Income Events
    TaxCategory["Airdrop"] = "airdrop";
    TaxCategory["StakingReward"] = "staking_reward";
    TaxCategory["MiningReward"] = "mining_reward";
    TaxCategory["DeFiYield"] = "defi_yield";
    TaxCategory["Salary"] = "salary";
    // Non-Taxable
    TaxCategory["Transfer"] = "transfer";
    TaxCategory["Purchase"] = "purchase";
    TaxCategory["GiftReceived"] = "gift_received";
    TaxCategory["GiftSent"] = "gift_sent";
    // Special
    TaxCategory["Fee"] = "fee";
    TaxCategory["Bridge"] = "bridge";
    TaxCategory["Deposit"] = "deposit";
    TaxCategory["Withdrawal"] = "withdrawal";
    TaxCategory["Unknown"] = "unknown";
})(TaxCategory || (TaxCategory = {}));
//# sourceMappingURL=transaction.js.map