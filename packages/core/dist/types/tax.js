/**
 * Tax types and interfaces
 */
export var TaxJurisdiction;
(function (TaxJurisdiction) {
    TaxJurisdiction["US"] = "us";
    TaxJurisdiction["UK"] = "uk";
    TaxJurisdiction["Germany"] = "de";
    TaxJurisdiction["France"] = "fr";
    TaxJurisdiction["India"] = "in";
})(TaxJurisdiction || (TaxJurisdiction = {}));
export const TAX_JURISDICTION_CONFIGS = {
    [TaxJurisdiction.US]: {
        jurisdiction: TaxJurisdiction.US,
        name: 'United States',
        currency: 'USD',
        supportedMethods: ['fifo', 'lifo', 'hifo', 'specific'],
        defaultMethod: 'fifo',
        shortTermDays: 365,
    },
    [TaxJurisdiction.UK]: {
        jurisdiction: TaxJurisdiction.UK,
        name: 'United Kingdom',
        currency: 'GBP',
        supportedMethods: ['fifo'], // Section 104 pool
        defaultMethod: 'fifo',
        shortTermDays: 0, // No distinction
        specialRules: ['section_104_pool'],
    },
    [TaxJurisdiction.Germany]: {
        jurisdiction: TaxJurisdiction.Germany,
        name: 'Germany',
        currency: 'EUR',
        supportedMethods: ['fifo'],
        defaultMethod: 'fifo',
        shortTermDays: 365,
        specialRules: ['one_year_tax_free'],
    },
    [TaxJurisdiction.France]: {
        jurisdiction: TaxJurisdiction.France,
        name: 'France',
        currency: 'EUR',
        supportedMethods: ['fifo'], // Average cost
        defaultMethod: 'fifo',
        shortTermDays: 0,
        specialRules: ['average_cost', 'flat_tax_30'],
    },
    [TaxJurisdiction.India]: {
        jurisdiction: TaxJurisdiction.India,
        name: 'India',
        currency: 'INR',
        supportedMethods: ['fifo'],
        defaultMethod: 'fifo',
        shortTermDays: 0,
        specialRules: ['flat_tax_30', 'no_loss_offset'],
    },
};
/**
 * Tax export format
 */
export var TaxExportFormat;
(function (TaxExportFormat) {
    TaxExportFormat["CSV"] = "csv";
    TaxExportFormat["Form8949"] = "form_8949";
    TaxExportFormat["TurboTax"] = "turbotax";
    TaxExportFormat["CoinTracker"] = "cointracker";
    TaxExportFormat["Koinly"] = "koinly";
})(TaxExportFormat || (TaxExportFormat = {}));
//# sourceMappingURL=tax.js.map