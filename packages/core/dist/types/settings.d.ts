/**
 * Application settings types
 */
import type { CostBasisMethod } from './transaction';
import type { TaxJurisdiction } from './tax';
export type Theme = 'light' | 'dark' | 'system';
export type FiatCurrency = 'USD' | 'EUR' | 'GBP' | 'INR' | 'JPY' | 'AUD' | 'CAD';
export interface AppSettings {
    /** UI Settings */
    theme: Theme;
    fiatCurrency: FiatCurrency;
    locale: string;
    /** Tax Settings */
    taxJurisdiction: TaxJurisdiction;
    costBasisMethod: CostBasisMethod;
    /** RPC Endpoints */
    rpcEndpoints: RPCEndpoints;
    /** AI Settings */
    ai: AISettings;
    /** Privacy Settings */
    privacy: PrivacySettings;
}
export interface RPCEndpoints {
    /** Bitcoin Electrum server */
    bitcoin?: string;
    /** Ethereum mainnet */
    ethereum?: string;
    /** Arbitrum */
    arbitrum?: string;
    /** Optimism */
    optimism?: string;
    /** Base */
    base?: string;
    /** Polygon */
    polygon?: string;
}
export declare const DEFAULT_RPC_ENDPOINTS: RPCEndpoints;
export interface AISettings {
    /** AI provider */
    provider: AIProvider;
    /** API key (stored encrypted) */
    apiKey?: string;
    /** Enable auto-categorization */
    autoCategorize: boolean;
    /** Model to use */
    model?: string;
}
export type AIProvider = 'anthropic' | 'openai' | 'none';
export interface PrivacySettings {
    /** Hide balances by default */
    hideBalances: boolean;
    /** Require password on app open */
    requirePasswordOnOpen: boolean;
    /** Auto-lock after inactivity (minutes, 0 = disabled) */
    autoLockMinutes: number;
}
export declare const DEFAULT_SETTINGS: AppSettings;
//# sourceMappingURL=settings.d.ts.map