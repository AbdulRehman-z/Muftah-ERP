/**
 * Mock Data Helpers for Customer Discount Rules
 * 
 * This module provides realistic mock data for example-based unit tests
 * of the customer discount rules feature. It includes examples of all
 * three discount types, active/inactive rules, and tiered discounts.
 * 
 * **Feature:** invoice-pricing-fix-and-customer-rules
 * **Task:** 10.2 - Create mock data helpers
 */

import type { CustomerDiscountRule } from "@/lib/sales/discount-engine";

/**
 * Mock customer IDs for testing
 */
export const MOCK_CUSTOMER_IDS = {
  DISTRIBUTOR_A: "customer-dist-a",
  DISTRIBUTOR_B: "customer-dist-b",
  RETAILER_A: "customer-retail-a",
  RETAILER_B: "customer-retail-b",
  WHOLESALER_A: "customer-whole-a",
} as const;

/**
 * Mock product IDs for testing
 */
export const MOCK_PRODUCT_IDS = {
  PRODUCT_A: "product-a",
  PRODUCT_B: "product-b",
  PRODUCT_C: "product-c",
} as const;

/**
 * Base date for testing (2024-01-01)
 */
export const BASE_DATE = new Date("2024-01-01T00:00:00Z");

/**
 * Creates a mock customer discount rule with carton_equivalent discount type
 * 
 * Example: "Buy 20 cartons, get 2 cartons worth of discount"
 * 
 * @param overrides - Optional fields to override defaults
 * @returns CustomerDiscountRule with carton_equivalent discount
 */
export function createMockCartonEquivalentRule(
  overrides?: Partial<CustomerDiscountRule>
): CustomerDiscountRule {
  return {
    id: "rule-carton-equiv-1",
    customerId: MOCK_CUSTOMER_IDS.DISTRIBUTOR_A,
    productId: MOCK_PRODUCT_IDS.PRODUCT_A,
    volumeThreshold: 20,
    discountType: "carton_equivalent",
    discountValue: 2, // 2 cartons worth of discount
    eligibleCustomerType: "all",
    effectiveFrom: BASE_DATE,
    effectiveTo: null,
    ...overrides,
  };
}

/**
 * Creates a mock customer discount rule with percentage discount type
 * 
 * Example: "Buy 50 cartons, get 10% off"
 * 
 * @param overrides - Optional fields to override defaults
 * @returns CustomerDiscountRule with percentage discount
 */
export function createMockPercentageRule(
  overrides?: Partial<CustomerDiscountRule>
): CustomerDiscountRule {
  return {
    id: "rule-percentage-1",
    customerId: MOCK_CUSTOMER_IDS.RETAILER_A,
    productId: MOCK_PRODUCT_IDS.PRODUCT_B,
    volumeThreshold: 50,
    discountType: "percentage",
    discountValue: 10, // 10% discount
    eligibleCustomerType: "retailer",
    effectiveFrom: BASE_DATE,
    effectiveTo: null,
    ...overrides,
  };
}

/**
 * Creates a mock customer discount rule with fixed_amount discount type
 * 
 * Example: "Buy 100 cartons, get PKR 5000 off"
 * 
 * @param overrides - Optional fields to override defaults
 * @returns CustomerDiscountRule with fixed_amount discount
 */
export function createMockFixedAmountRule(
  overrides?: Partial<CustomerDiscountRule>
): CustomerDiscountRule {
  return {
    id: "rule-fixed-1",
    customerId: MOCK_CUSTOMER_IDS.WHOLESALER_A,
    productId: MOCK_PRODUCT_IDS.PRODUCT_C,
    volumeThreshold: 100,
    discountType: "fixed_amount",
    discountValue: 5000, // PKR 5000 discount
    eligibleCustomerType: "wholesaler",
    effectiveFrom: BASE_DATE,
    effectiveTo: null,
    ...overrides,
  };
}

/**
 * Creates a mock inactive discount rule (expired)
 * 
 * The rule has an effectiveTo date in the past, making it inactive.
 * 
 * @param overrides - Optional fields to override defaults
 * @returns CustomerDiscountRule that is expired
 */
export function createMockInactiveRule(
  overrides?: Partial<CustomerDiscountRule>
): CustomerDiscountRule {
  return {
    id: "rule-inactive-1",
    customerId: MOCK_CUSTOMER_IDS.DISTRIBUTOR_A,
    productId: MOCK_PRODUCT_IDS.PRODUCT_A,
    volumeThreshold: 30,
    discountType: "carton_equivalent",
    discountValue: 3,
    eligibleCustomerType: "all",
    effectiveFrom: new Date("2023-01-01T00:00:00Z"),
    effectiveTo: new Date("2023-12-31T23:59:59Z"), // Expired
    ...overrides,
  };
}

/**
 * Creates a mock future discount rule (not yet active)
 * 
 * The rule has an effectiveFrom date in the future, making it inactive.
 * 
 * @param overrides - Optional fields to override defaults
 * @returns CustomerDiscountRule that is not yet active
 */
export function createMockFutureRule(
  overrides?: Partial<CustomerDiscountRule>
): CustomerDiscountRule {
  // Set effectiveFrom to 30 days in the future
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);
  
  return {
    id: "rule-future-1",
    customerId: MOCK_CUSTOMER_IDS.RETAILER_A,
    productId: MOCK_PRODUCT_IDS.PRODUCT_B,
    volumeThreshold: 25,
    discountType: "percentage",
    discountValue: 15,
    eligibleCustomerType: "retailer",
    effectiveFrom: futureDate,
    effectiveTo: null,
    ...overrides,
  };
}

/**
 * Creates a set of tiered discount rules for the same customer and product
 * 
 * Example tiered structure:
 * - Buy 10 cartons: get 1 carton discount
 * - Buy 50 cartons: get 5 cartons discount
 * - Buy 100 cartons: get 12 cartons discount
 * 
 * @param customerId - The customer ID for all rules
 * @param productId - The product ID for all rules
 * @returns Array of CustomerDiscountRule with increasing thresholds
 */
export function createMockTieredRules(
  customerId: string = MOCK_CUSTOMER_IDS.DISTRIBUTOR_A,
  productId: string = MOCK_PRODUCT_IDS.PRODUCT_A
): CustomerDiscountRule[] {
  return [
    {
      id: "rule-tier-1",
      customerId,
      productId,
      volumeThreshold: 10,
      discountType: "carton_equivalent",
      discountValue: 1,
      eligibleCustomerType: "all",
      effectiveFrom: BASE_DATE,
      effectiveTo: null,
    },
    {
      id: "rule-tier-2",
      customerId,
      productId,
      volumeThreshold: 50,
      discountType: "carton_equivalent",
      discountValue: 5,
      eligibleCustomerType: "all",
      effectiveFrom: BASE_DATE,
      effectiveTo: null,
    },
    {
      id: "rule-tier-3",
      customerId,
      productId,
      volumeThreshold: 100,
      discountType: "carton_equivalent",
      discountValue: 12,
      eligibleCustomerType: "all",
      effectiveFrom: BASE_DATE,
      effectiveTo: null,
    },
  ];
}

/**
 * Creates a set of tiered percentage discount rules
 * 
 * Example tiered structure:
 * - Buy 20 cartons: get 5% off
 * - Buy 50 cartons: get 10% off
 * - Buy 100 cartons: get 15% off
 * 
 * @param customerId - The customer ID for all rules
 * @param productId - The product ID for all rules
 * @returns Array of CustomerDiscountRule with percentage discounts
 */
export function createMockTieredPercentageRules(
  customerId: string = MOCK_CUSTOMER_IDS.RETAILER_A,
  productId: string = MOCK_PRODUCT_IDS.PRODUCT_B
): CustomerDiscountRule[] {
  return [
    {
      id: "rule-pct-tier-1",
      customerId,
      productId,
      volumeThreshold: 20,
      discountType: "percentage",
      discountValue: 5,
      eligibleCustomerType: "all",
      effectiveFrom: BASE_DATE,
      effectiveTo: null,
    },
    {
      id: "rule-pct-tier-2",
      customerId,
      productId,
      volumeThreshold: 50,
      discountType: "percentage",
      discountValue: 10,
      eligibleCustomerType: "all",
      effectiveFrom: BASE_DATE,
      effectiveTo: null,
    },
    {
      id: "rule-pct-tier-3",
      customerId,
      productId,
      volumeThreshold: 100,
      discountType: "percentage",
      discountValue: 15,
      eligibleCustomerType: "all",
      effectiveFrom: BASE_DATE,
      effectiveTo: null,
    },
  ];
}

/**
 * Creates discount rules with different customer type eligibility
 * 
 * @returns Array of CustomerDiscountRule with different eligibleCustomerType values
 */
export function createMockCustomerTypeRules(): CustomerDiscountRule[] {
  return [
    {
      id: "rule-dist-only",
      customerId: MOCK_CUSTOMER_IDS.DISTRIBUTOR_A,
      productId: MOCK_PRODUCT_IDS.PRODUCT_A,
      volumeThreshold: 20,
      discountType: "carton_equivalent",
      discountValue: 3,
      eligibleCustomerType: "distributor",
      effectiveFrom: BASE_DATE,
      effectiveTo: null,
    },
    {
      id: "rule-retail-only",
      customerId: MOCK_CUSTOMER_IDS.RETAILER_A,
      productId: MOCK_PRODUCT_IDS.PRODUCT_B,
      volumeThreshold: 15,
      discountType: "percentage",
      discountValue: 8,
      eligibleCustomerType: "retailer",
      effectiveFrom: BASE_DATE,
      effectiveTo: null,
    },
    {
      id: "rule-whole-only",
      customerId: MOCK_CUSTOMER_IDS.WHOLESALER_A,
      productId: MOCK_PRODUCT_IDS.PRODUCT_C,
      volumeThreshold: 50,
      discountType: "fixed_amount",
      discountValue: 3000,
      eligibleCustomerType: "wholesaler",
      effectiveFrom: BASE_DATE,
      effectiveTo: null,
    },
    {
      id: "rule-all-types",
      customerId: MOCK_CUSTOMER_IDS.DISTRIBUTOR_B,
      productId: MOCK_PRODUCT_IDS.PRODUCT_A,
      volumeThreshold: 10,
      discountType: "carton_equivalent",
      discountValue: 1,
      eligibleCustomerType: "all",
      effectiveFrom: BASE_DATE,
      effectiveTo: null,
    },
  ];
}

/**
 * Mock price agreements for testing discount calculations
 */
export const MOCK_PRICE_AGREEMENTS = {
  PRODUCT_A_DIST_A: {
    id: "price-agreement-1",
    customerId: MOCK_CUSTOMER_IDS.DISTRIBUTOR_A,
    productId: MOCK_PRODUCT_IDS.PRODUCT_A,
    agreedPrice: 615, // PKR per carton
  },
  PRODUCT_B_RETAIL_A: {
    id: "price-agreement-2",
    customerId: MOCK_CUSTOMER_IDS.RETAILER_A,
    productId: MOCK_PRODUCT_IDS.PRODUCT_B,
    agreedPrice: 1000, // PKR per carton
  },
  PRODUCT_C_WHOLE_A: {
    id: "price-agreement-3",
    customerId: MOCK_CUSTOMER_IDS.WHOLESALER_A,
    productId: MOCK_PRODUCT_IDS.PRODUCT_C,
    agreedPrice: 850, // PKR per carton
  },
} as const;

/**
 * Mock promotional rules for testing discount stacking
 */
export const MOCK_PROMOTIONAL_RULES = {
  BUY_20_GET_2_FREE: {
    id: "promo-1",
    productId: MOCK_PRODUCT_IDS.PRODUCT_A,
    buyQuantity: 20,
    freeQuantity: 2,
    eligibleCustomerTypes: ["distributor", "retailer", "wholesaler"],
  },
  BUY_50_GET_5_FREE: {
    id: "promo-2",
    productId: MOCK_PRODUCT_IDS.PRODUCT_B,
    buyQuantity: 50,
    freeQuantity: 5,
    eligibleCustomerTypes: ["retailer"],
  },
} as const;

/**
 * Creates a comprehensive set of mock rules for testing various scenarios
 * 
 * Includes:
 * - Active rules of all three discount types
 * - Inactive (expired) rules
 * - Future rules
 * - Tiered rules
 * - Customer type specific rules
 * 
 * @returns Array of CustomerDiscountRule covering multiple test scenarios
 */
export function createMockRuleSet(): CustomerDiscountRule[] {
  return [
    // Active rules - one of each type
    createMockCartonEquivalentRule(),
    createMockPercentageRule(),
    createMockFixedAmountRule(),
    
    // Inactive rules
    createMockInactiveRule(),
    createMockFutureRule(),
    
    // Tiered rules for distributor A
    ...createMockTieredRules(),
    
    // Customer type specific rules
    ...createMockCustomerTypeRules(),
  ];
}

/**
 * Test scenario: Bug fix verification (24 packs × 615 vs 20 cartons × 615)
 * 
 * This scenario represents the original bug where quantity (loose packs)
 * was incorrectly used as a multiplier instead of numberOfCartons.
 */
export const BUG_FIX_SCENARIO = {
  numberOfCartons: 20,
  quantity: 24, // Loose packs (should NOT be used as multiplier)
  perCartonPrice: 615,
  packsPerCarton: 24,
  expectedAmount: 12300, // 20 cartons × 615 = 12,300 (CORRECT)
  incorrectAmount: 14760, // 24 packs × 615 = 14,760 (BUG)
} as const;

/**
 * Test scenario: Volume discount with promotional rule stacking
 * 
 * Customer buys 25 cartons at PKR 615 per carton:
 * - Base amount: 25 × 615 = 15,375
 * - Promotional discount: 2 free cartons = 2 × 615 = 1,230
 * - Customer discount: 2 cartons equivalent = 2 × 615 = 1,230
 * - Final amount: 15,375 - 1,230 - 1,230 = 12,915
 */
export const STACKED_DISCOUNT_SCENARIO = {
  numberOfCartons: 25,
  perCartonPrice: 615,
  promoFreeCartons: 2,
  customerDiscountCartons: 2,
  baseAmount: 15375,
  promoDiscount: 1230,
  customerDiscount: 1230,
  expectedFinalAmount: 12915,
} as const;

/**
 * Test scenario: Tiered discount selection
 * 
 * Customer buys 120 cartons, eligible for multiple tiers:
 * - Tier 1: 10 cartons → 1 carton discount
 * - Tier 2: 50 cartons → 5 cartons discount
 * - Tier 3: 100 cartons → 12 cartons discount
 * 
 * Should select Tier 3 (highest applicable threshold)
 */
export const TIERED_DISCOUNT_SCENARIO = {
  numberOfCartons: 120,
  perCartonPrice: 615,
  applicableTiers: [
    { threshold: 10, discount: 1 },
    { threshold: 50, discount: 5 },
    { threshold: 100, discount: 12 },
  ],
  expectedSelectedTier: { threshold: 100, discount: 12 },
  expectedDiscountAmount: 7380, // 12 cartons × 615
} as const;

/**
 * Test scenario: Customer type eligibility filtering
 * 
 * A retailer customer should only receive discounts marked as:
 * - eligibleCustomerType: "retailer"
 * - eligibleCustomerType: "all"
 * 
 * Should NOT receive discounts marked as "distributor" or "wholesaler"
 */
export const CUSTOMER_TYPE_SCENARIO = {
  customerType: "retailer",
  eligibleRules: [
    { id: "rule-retail", eligibleCustomerType: "retailer" },
    { id: "rule-all", eligibleCustomerType: "all" },
  ],
  ineligibleRules: [
    { id: "rule-dist", eligibleCustomerType: "distributor" },
    { id: "rule-whole", eligibleCustomerType: "wholesaler" },
  ],
} as const;

/**
 * Test scenario: Edge case - discount exceeds base amount
 * 
 * Customer buys 5 cartons at PKR 100 per carton with a fixed discount of PKR 1000:
 * - Base amount: 5 × 100 = 500
 * - Fixed discount: 1000
 * - Expected final amount: 0 (clamped, never negative)
 */
export const EXCESSIVE_DISCOUNT_SCENARIO = {
  numberOfCartons: 5,
  perCartonPrice: 100,
  fixedDiscount: 1000,
  baseAmount: 500,
  expectedFinalAmount: 0, // Clamped to zero
} as const;

/**
 * Test scenario: Edge case - zero cartons (no discount should apply)
 */
export const ZERO_CARTONS_SCENARIO = {
  numberOfCartons: 0,
  perCartonPrice: 615,
  volumeThreshold: 10,
  expectedDiscountAmount: 0,
  expectedRuleId: null,
} as const;

/**
 * Test scenario: Edge case - exactly at threshold
 */
export const EXACT_THRESHOLD_SCENARIO = {
  numberOfCartons: 20,
  perCartonPrice: 615,
  volumeThreshold: 20,
  discountValue: 2,
  expectedDiscountAmount: 1230, // Should apply (>= threshold)
} as const;

/**
 * Test scenario: Edge case - one below threshold
 */
export const BELOW_THRESHOLD_SCENARIO = {
  numberOfCartons: 19,
  perCartonPrice: 615,
  volumeThreshold: 20,
  expectedDiscountAmount: 0, // Should NOT apply
  expectedRuleId: null,
} as const;
