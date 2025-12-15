# Transformation Examples

This document shows concrete examples of how chain-specific transactions are transformed into the unified data model.

## Example 1: Bitcoin Transaction with Multiple Outputs

### Scenario
Alice sends Bitcoin to two different addresses (batch payment) and gets change back.

### Raw Bitcoin Transaction
```json
{
  "txid": "a1b2c3d4e5f6...abcdef",
  "version": 2,
  "locktime": 0,
  "vin": [
    {
      "txid": "prev_tx_123...",
      "vout": 0,
      "scriptSig": "...",
      "witness": ["304402...", "03ab12..."],
      "sequence": 4294967295,
      "address": "bc1qalice...",
      "value": 50000000  // 0.5 BTC
    }
  ],
  "vout": [
    {
      "n": 0,
      "value": 10000000,  // 0.1 BTC
      "scriptPubKey": "0014...",
      "address": "bc1qbob...",
      "type": "witness_v0_keyhash"
    },
    {
      "n": 1,
      "value": 15000000,  // 0.15 BTC
      "scriptPubKey": "0014...",
      "address": "bc1qcarol...",
      "type": "witness_v0_keyhash"
    },
    {
      "n": 2,
      "value": 24995000,  // 0.24995 BTC (change)
      "scriptPubKey": "0014...",
      "address": "bc1qalice2...",
      "type": "witness_v0_keyhash"
    }
  ],
  "blockHeight": 800000,
  "blockTime": 1700000000,
  "confirmations": 6,
  "vsize": 141,
  "weight": 561,
  "isSegwit": true,
  "isRbf": false
}
```

### Transformed Unified Transaction
```json
{
  "id": "a1b2c3d4e5f6...abcdef",
  "chain": "bitcoin",
  "hash": "a1b2c3d4e5f6...abcdef",
  "blockNumber": 800000,
  "blockHash": "00000000000000000002...",
  "transactionIndex": 42,
  "timestamp": 1700000000,
  "confirmations": 6,
  "status": "confirmed",
  "direction": "outgoing",  // Alice is sending

  "fee": {
    "amount": {
      "asset": {
        "chain": "bitcoin",
        "type": "native",
        "symbol": "BTC",
        "name": "Bitcoin",
        "decimals": 8,
        "contractAddress": null
      },
      "raw": "5000",  // 50000000 - (10000000 + 15000000 + 24995000)
      "formatted": "0.00005000",
      "fiatValue": {
        "currency": "USD",
        "amount": "2.15",
        "price": "43000.00",
        "priceTimestamp": 1700000000,
        "priceSource": "coingecko"
      }
    },
    "feeRate": {
      "satPerVbyte": 35.46  // 5000 / 141
    },
    "payer": "bc1qalice..."
  },

  "transfers": [
    {
      "id": "a1b2c3d4e5f6...abcdef:0",
      "from": "bc1qalice...",
      "to": "bc1qbob...",
      "amount": {
        "asset": {
          "chain": "bitcoin",
          "type": "native",
          "symbol": "BTC",
          "name": "Bitcoin",
          "decimals": 8,
          "contractAddress": null
        },
        "raw": "10000000",
        "formatted": "0.10000000",
        "fiatValue": {
          "currency": "USD",
          "amount": "4300.00",
          "price": "43000.00",
          "priceTimestamp": 1700000000,
          "priceSource": "coingecko"
        }
      },
      "transferType": "native",
      "logIndex": null
    },
    {
      "id": "a1b2c3d4e5f6...abcdef:1",
      "from": "bc1qalice...",
      "to": "bc1qcarol...",
      "amount": {
        "asset": {
          "chain": "bitcoin",
          "type": "native",
          "symbol": "BTC",
          "name": "Bitcoin",
          "decimals": 8,
          "contractAddress": null
        },
        "raw": "15000000",
        "formatted": "0.15000000",
        "fiatValue": {
          "currency": "USD",
          "amount": "6450.00",
          "price": "43000.00",
          "priceTimestamp": 1700000000,
          "priceSource": "coingecko"
        }
      },
      "transferType": "native",
      "logIndex": null
    },
    {
      "id": "a1b2c3d4e5f6...abcdef:2",
      "from": "bc1qalice...",
      "to": "bc1qalice2...",
      "amount": {
        "asset": {
          "chain": "bitcoin",
          "type": "native",
          "symbol": "BTC",
          "name": "Bitcoin",
          "decimals": 8,
          "contractAddress": null
        },
        "raw": "24995000",
        "formatted": "0.24995000",
        "fiatValue": {
          "currency": "USD",
          "amount": "10748.85",
          "price": "43000.00",
          "priceTimestamp": 1700000000,
          "priceSource": "coingecko"
        }
      },
      "transferType": "native",
      "logIndex": null
    }
  ],

  "contractInteractions": [],

  "taxCategory": "payment_sent",
  "taxCategoryConfidence": 0.85,
  "taxSubCategory": "batch_payment",
  "notes": null,
  "tags": ["payment"],

  "costBasis": [
    {
      "asset": {
        "chain": "bitcoin",
        "type": "native",
        "symbol": "BTC",
        "name": "Bitcoin",
        "decimals": 8,
        "contractAddress": null
      },
      "amount": "0.25000000",  // 0.1 + 0.15 (excluding change)
      "costBasisFiat": "9500.00",  // Acquired at $38,000
      "acquiredAt": 1650000000,
      "acquisitionTxId": "prev_tx_123...",
      "holdingPeriod": "long",
      "proceedsFiat": "10750.00",
      "gainLoss": "1250.00",
      "method": "fifo"
    }
  ],

  "chainSpecific": {
    "chain": "bitcoin",
    "inputs": [...],
    "outputs": [...],
    "version": 2,
    "lockTime": 0,
    "vsize": 141,
    "weight": 561,
    "isSegwit": true,
    "isRbf": false
  },

  "createdAt": 1700000050,
  "updatedAt": 1700000050
}
```

### Key Transformations
1. **Multiple Outputs → Multiple Transfers**: Each Bitcoin output becomes a separate transfer
2. **Fee Calculation**: Total input - total output = 5000 sats
3. **Direction Detection**: User owns input address → "outgoing"
4. **Change Detection**: Output to user's own address (bc1qalice2...) is change, not a taxable event
5. **Cost Basis**: Only non-change outputs (0.25 BTC) trigger cost basis calculation

---

## Example 2: Ethereum ERC-20 Swap on Uniswap

### Scenario
Alice swaps 1000 USDC for ETH on Uniswap V3.

### Raw Ethereum Transaction
```json
{
  "hash": "0xabc123...",
  "from": "0xalice...",
  "to": "0xUniswapV3Router...",
  "value": "0",  // No native ETH sent
  "gasLimit": "200000",
  "gasPrice": null,
  "maxFeePerGas": "30000000000",  // 30 gwei
  "maxPriorityFeePerGas": "2000000000",  // 2 gwei
  "type": 2,  // EIP-1559
  "nonce": 42,
  "input": "0x414bf389...",  // Encoded swap function
  "blockNumber": 18500000,
  "blockTimestamp": 1700000000,
  "confirmations": 12
}
```

### Transaction Receipt
```json
{
  "status": 1,
  "gasUsed": "150000",
  "effectiveGasPrice": "25000000000",  // 25 gwei
  "baseFeePerGas": "23000000000",
  "logs": [
    {
      "logIndex": 0,
      "address": "0xUSDC...",
      "topics": [
        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",  // Transfer
        "0x000000000000000000000000alice...",  // from (padded)
        "0x000000000000000000000000UniswapV3Pool..."  // to (padded)
      ],
      "data": "0x00000000000000000000000000000000000000000000000000000000003b9aca00"  // 1000000000 (1000 USDC)
    },
    {
      "logIndex": 1,
      "address": "0xWETH...",
      "topics": [
        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
        "0x000000000000000000000000UniswapV3Pool...",
        "0x000000000000000000000000alice..."
      ],
      "data": "0x000000000000000000000000000000000000000000000000056bc75e2d63100000"  // 0.4 WETH
    }
  ]
}
```

### Transformed Unified Transaction
```json
{
  "id": "0xabc123...",
  "chain": "ethereum",
  "hash": "0xabc123...",
  "blockNumber": 18500000,
  "blockHash": "0xblock...",
  "transactionIndex": 105,
  "timestamp": 1700000000,
  "confirmations": 12,
  "status": "confirmed",
  "direction": "swap",

  "fee": {
    "amount": {
      "asset": {
        "chain": "ethereum",
        "type": "native",
        "symbol": "ETH",
        "name": "Ethereum",
        "decimals": 18,
        "contractAddress": null
      },
      "raw": "3750000000000000",  // 150000 * 25000000000
      "formatted": "0.003750000000000000",
      "fiatValue": {
        "currency": "USD",
        "amount": "7.88",
        "price": "2100.00",
        "priceTimestamp": 1700000000,
        "priceSource": "coingecko"
      }
    },
    "feeRate": {
      "gasUsed": "150000",
      "effectiveGasPrice": "25000000000",
      "maxFeePerGas": "30000000000",
      "maxPriorityFeePerGas": "2000000000"
    },
    "payer": "0xalice..."
  },

  "transfers": [
    {
      "id": "0xabc123...:erc20:0",
      "from": "0xalice...",
      "to": "0xUniswapV3Pool...",
      "amount": {
        "asset": {
          "chain": "ethereum",
          "type": "token",
          "symbol": "USDC",
          "name": "USD Coin",
          "decimals": 6,
          "contractAddress": "0xUSDC...",
          "priceId": "usd-coin"
        },
        "raw": "1000000000",
        "formatted": "1000.000000",
        "fiatValue": {
          "currency": "USD",
          "amount": "1000.00",
          "price": "1.00",
          "priceTimestamp": 1700000000,
          "priceSource": "coingecko"
        }
      },
      "transferType": "token",
      "logIndex": 0
    },
    {
      "id": "0xabc123...:erc20:1",
      "from": "0xUniswapV3Pool...",
      "to": "0xalice...",
      "amount": {
        "asset": {
          "chain": "ethereum",
          "type": "token",
          "symbol": "WETH",
          "name": "Wrapped Ether",
          "decimals": 18,
          "contractAddress": "0xWETH...",
          "priceId": "weth"
        },
        "raw": "400000000000000000",
        "formatted": "0.400000000000000000",
        "fiatValue": {
          "currency": "USD",
          "amount": "840.00",
          "price": "2100.00",
          "priceTimestamp": 1700000000,
          "priceSource": "coingecko"
        }
      },
      "transferType": "token",
      "logIndex": 1
    }
  ],

  "contractInteractions": [
    {
      "address": "0xUniswapV3Router...",
      "name": "Uniswap V3 Router",
      "method": "exactInputSingle",
      "description": "Swap exact tokens for tokens",
      "type": "swap",
      "params": {
        "tokenIn": "0xUSDC...",
        "tokenOut": "0xWETH...",
        "fee": 3000,
        "amountIn": "1000000000",
        "amountOutMinimum": "380000000000000000"
      }
    }
  ],

  "taxCategory": "swap",
  "taxCategoryConfidence": 0.98,
  "taxSubCategory": "defi_swap",
  "notes": "Uniswap V3 swap: USDC → WETH",
  "tags": ["defi", "uniswap", "swap"],

  "costBasis": [
    {
      "asset": {
        "chain": "ethereum",
        "type": "token",
        "symbol": "USDC",
        "name": "USD Coin",
        "decimals": 6,
        "contractAddress": "0xUSDC..."
      },
      "amount": "1000.000000",
      "costBasisFiat": "1000.00",  // Stablecoin, cost basis = face value
      "acquiredAt": 1680000000,
      "acquisitionTxId": "0xprev...",
      "holdingPeriod": "long",
      "proceedsFiat": "840.00",  // Value of WETH received
      "gainLoss": "-160.00",  // Loss due to swap (WETH price < USDC amount)
      "method": "fifo"
    }
  ],

  "chainSpecific": {
    "chain": "ethereum",
    "from": "0xalice...",
    "to": "0xUniswapV3Router...",
    "value": "0",
    "gasLimit": "200000",
    "gasUsed": "150000",
    "gasPrice": null,
    "maxFeePerGas": "30000000000",
    "maxPriorityFeePerGas": "2000000000",
    "baseFeePerGas": "23000000000",
    "effectiveGasPrice": "25000000000",
    "type": 2,
    "nonce": 42,
    "input": "0x414bf389...",
    "contractAddress": null,
    "logs": [...],
    "internalTransactions": null,
    "decodedInput": {
      "method": "exactInputSingle",
      "params": {
        "tokenIn": "0xUSDC...",
        "tokenOut": "0xWETH...",
        "fee": 3000,
        "recipient": "0xalice...",
        "deadline": 1700001000,
        "amountIn": "1000000000",
        "amountOutMinimum": "380000000000000000",
        "sqrtPriceLimitX96": "0"
      }
    }
  },

  "createdAt": 1700000050,
  "updatedAt": 1700000050
}
```

### Key Transformations
1. **Logs → Transfers**: ERC-20 Transfer events decoded from logs
2. **Swap Detection**: Two transfers + Uniswap contract = swap
3. **Direction**: User both sends and receives → "swap"
4. **Tax Treatment**: Swap is a taxable disposal of USDC (capital gain/loss)
5. **Contract Interaction**: Decoded method call shows swap details
6. **EIP-1559 Fee**: Uses effective gas price (base + priority fee)

---

## Example 3: Solana SPL Token Transfer

### Scenario
Alice sends 50 USDC on Solana to Bob.

### Raw Solana Transaction
```json
{
  "signature": "5j6K7L8M9N...",
  "slot": 200000000,
  "blockTime": 1700000000,
  "confirmations": 32,
  "fee": 5000,  // 0.000005 SOL
  "feePayer": "AlicePublicKey...",
  "recentBlockhash": "Gx9Y8Z...",

  "instructions": [
    {
      "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      "programName": "SPL Token",
      "index": 0,
      "accounts": [0, 1, 2],
      "data": "3Bxs4h24hBtQy9rw",
      "decoded": {
        "type": "transfer",
        "info": {
          "source": "AliceTokenAccount...",
          "destination": "BobTokenAccount...",
          "authority": "AlicePublicKey...",
          "amount": "50000000"  // 50 USDC (6 decimals)
        }
      }
    }
  ],

  "accountKeys": [
    "AlicePublicKey...",
    "AliceTokenAccount...",
    "BobTokenAccount..."
  ],

  "preBalances": [
    1000000000,  // Alice's SOL: 1 SOL
    0,
    0
  ],

  "postBalances": [
    999995000,   // Alice's SOL: 0.999995 SOL (paid fee)
    0,
    0
  ],

  "preTokenBalances": [
    {
      "accountIndex": 1,
      "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",  // USDC
      "owner": "AlicePublicKey...",
      "uiTokenAmount": {
        "amount": "100000000",
        "decimals": 6,
        "uiAmount": 100.0
      }
    }
  ],

  "postTokenBalances": [
    {
      "accountIndex": 1,
      "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "owner": "AlicePublicKey...",
      "uiTokenAmount": {
        "amount": "50000000",
        "decimals": 6,
        "uiAmount": 50.0
      }
    },
    {
      "accountIndex": 2,
      "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "owner": "BobPublicKey...",
      "uiTokenAmount": {
        "amount": "50000000",
        "decimals": 6,
        "uiAmount": 50.0
      }
    }
  ],

  "computeUnitsConsumed": 2100,
  "logMessages": [
    "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [1]",
    "Program log: Instruction: Transfer",
    "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success"
  ]
}
```

### Transformed Unified Transaction
```json
{
  "id": "5j6K7L8M9N...",
  "chain": "solana",
  "hash": "5j6K7L8M9N...",
  "blockNumber": 200000000,
  "blockHash": null,
  "transactionIndex": null,
  "timestamp": 1700000000,
  "confirmations": 32,
  "status": "confirmed",
  "direction": "outgoing",

  "fee": {
    "amount": {
      "asset": {
        "chain": "solana",
        "type": "native",
        "symbol": "SOL",
        "name": "Solana",
        "decimals": 9,
        "contractAddress": null
      },
      "raw": "5000",
      "formatted": "0.000005000",
      "fiatValue": {
        "currency": "USD",
        "amount": "0.0003",
        "price": "60.00",
        "priceTimestamp": 1700000000,
        "priceSource": "coingecko"
      }
    },
    "feeRate": {
      "computeUnits": 2100
    },
    "payer": "AlicePublicKey..."
  },

  "transfers": [
    {
      "id": "5j6K7L8M9N...:spl:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v:1",
      "from": "AliceTokenAccount...",
      "to": "BobTokenAccount...",
      "amount": {
        "asset": {
          "chain": "solana",
          "type": "token",
          "symbol": "USDC",
          "name": "USD Coin",
          "decimals": 6,
          "contractAddress": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          "priceId": "usd-coin"
        },
        "raw": "50000000",
        "formatted": "50.000000",
        "fiatValue": {
          "currency": "USD",
          "amount": "50.00",
          "price": "1.00",
          "priceTimestamp": 1700000000,
          "priceSource": "coingecko"
        }
      },
      "transferType": "token",
      "logIndex": 1
    }
  ],

  "contractInteractions": [],

  "taxCategory": "transfer",  // Simple transfer, not taxable
  "taxCategoryConfidence": 0.95,
  "taxSubCategory": "token_transfer",
  "notes": null,
  "tags": ["usdc", "transfer"],

  "costBasis": null,  // No cost basis for non-taxable transfers

  "chainSpecific": {
    "chain": "solana",
    "signatures": ["5j6K7L8M9N..."],
    "recentBlockhash": "Gx9Y8Z...",
    "feePayer": "AlicePublicKey...",
    "instructions": [
      {
        "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        "programName": "SPL Token",
        "index": 0,
        "accounts": [0, 1, 2],
        "data": "3Bxs4h24hBtQy9rw",
        "decoded": {
          "type": "transfer",
          "info": {
            "source": "AliceTokenAccount...",
            "destination": "BobTokenAccount...",
            "authority": "AlicePublicKey...",
            "amount": "50000000"
          }
        }
      }
    ],
    "innerInstructions": null,
    "accountKeys": [
      "AlicePublicKey...",
      "AliceTokenAccount...",
      "BobTokenAccount..."
    ],
    "computeUnitsConsumed": 2100,
    "logMessages": [...],
    "preBalances": ["1000000000", "0", "0"],
    "postBalances": ["999995000", "0", "0"],
    "preTokenBalances": [...],
    "postTokenBalances": [...]
  },

  "createdAt": 1700000050,
  "updatedAt": 1700000050
}
```

### Key Transformations
1. **Token Balance Deltas → Transfers**: Compare pre/post token balances
2. **Account Index Mapping**: Map token account indices to actual addresses
3. **Instruction Decoding**: SPL Token Transfer instruction decoded
4. **Fee Model**: Fixed fee per transaction (5000 lamports)
5. **Compute Units**: Track computational cost (for analytics)
6. **Direction Detection**: Alice owns source account → "outgoing"

---

## Handling Edge Cases

### Multiple Asset Transfers in Single Transaction

Some transactions involve multiple assets:

**Example**: Ethereum transaction that:
- Sends 0.5 ETH (native)
- Sends 1000 USDC (ERC-20)
- Receives 10 UNI (ERC-20)

**Solution**: Create multiple `Transfer` objects in the same `UnifiedTransaction`:
```typescript
{
  transfers: [
    { /* 0.5 ETH transfer */ },
    { /* 1000 USDC transfer */ },
    { /* 10 UNI received */ }
  ],
  direction: "swap"  // Mixed directions
}
```

### Failed Transactions

**Bitcoin**: Failed transactions don't make it to the blockchain
**Ethereum**: Failed transactions are recorded but status = "failed"
**Solana**: Failed transactions are recorded but status = "failed"

```typescript
{
  status: "failed",
  transfers: [],  // No actual transfers occurred
  fee: { /* Fee still paid */ },
  chainSpecific: {
    // Contains error info
  }
}
```

### NFT Transfers

NFTs are just a special case of token transfers:

```typescript
{
  amount: {
    asset: {
      type: "nft",
      symbol: "BAYC",
      name: "Bored Ape Yacht Club",
      contractAddress: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
      tokenId: "1234",
      imageUrl: "ipfs://...",
      decimals: 0  // NFTs are indivisible
    },
    raw: "1",
    formatted: "1"
  }
}
```

### Bridge Transactions

Cross-chain bridges require special handling:

```typescript
{
  taxCategory: "bridge",
  transfers: [
    { /* ETH on Ethereum sent to bridge */ }
  ],
  notes: "Bridged to Arbitrum",
  tags: ["bridge", "arbitrum"]
}

// Separate transaction on destination chain
{
  taxCategory: "bridge",
  transfers: [
    { /* ETH on Arbitrum received from bridge */ }
  ],
  notes: "Bridged from Ethereum",
  tags: ["bridge", "ethereum"]
}
```

Both transactions are marked as non-taxable transfers.

---

## Tax Calculation Example

### Scenario: Swap with Cost Basis

Alice bought 1000 USDC on January 1, 2024 for $1000.
On March 15, 2024, she swaps it for 0.4 ETH when ETH = $2500.

**Tax Treatment**:
1. **Disposal Event**: Selling 1000 USDC
2. **Cost Basis**: $1000 (original purchase price)
3. **Proceeds**: $1000 (0.4 ETH × $2500)
4. **Gain/Loss**: $0
5. **Holding Period**: 74 days (short-term)

**In Unified Model**:
```typescript
{
  taxCategory: "swap",
  costBasis: [
    {
      asset: { symbol: "USDC", ... },
      amount: "1000.000000",
      costBasisFiat: "1000.00",
      acquiredAt: 1704067200,  // Jan 1, 2024
      acquisitionTxId: "0xprev...",
      holdingPeriod: "short",  // < 1 year
      proceedsFiat: "1000.00",
      gainLoss: "0.00",
      method: "fifo"
    }
  ]
}
```

The new asset (0.4 ETH) gets a cost basis of $1000 for future calculations.
