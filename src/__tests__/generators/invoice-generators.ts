/**
 * Test Data Generators for Invoice Pricing and Customer Discount Rules
 * 
 * This module provides fast-check arbitraries for generating test data
 * for property-based testing of invoice pricing calculations and customer
 * discount rules.
 * 
 * **Feature:** invoice-pricing-fix-and-customer-rules
 */

import * as fc from "fast-check";
import type { CustomerDiscountRule } from "@/lib/sales/discount-engine";

/**
 * Generates arbitrary invoice item data for property-based testing
 * 
 * Generates realistic invoice item data with:
 * - numberOfCartons: 0-1000 cartons
 * - quantity: 0-100 loose packs
 * - perCartonPrice: 1-10000 PKR
 * - packsPerCarton: 1-50 packs per carton
 * - discountCartons: 0-50 free cartons (promotional discount)
 * 
 * @returns fast-check arbitrary for invoice item data
 */
export const invoiceItemArbitrary = fc.record({
  numberOfCartons: fc.integer({ min: 0, max: 1000 }),
  quantity: fc.integer({ min: 0, max: 100 }),
  perCartonPrice: fc.float({ min: 1, max: 10000, noNaN: true }),
  packsPerCarton: fc.integer({ min: 1, max: 50 }),
  discountCartons: fc.integer({ min: 0, max: 50 }),
});

/**
 * Generates arbitrary customer discount rule data for property-based testing
 * 
 * Generates realistic customer discount rules with:
 * - id: UUID-like string
 * - customerId: UUID-like string
 * - productId: UUID-like string
 * - volumeThreshold: 1-1000 cartons
 * - discountType: one of "carton_equivalent", "percentage", "fixed_amount"
 * - discountValue: varies by type (0-100 for percentage, 0-50 for carton_equivalent, 0-5000 for fixed_amount)
 * - eligibleCustomerType: one of "distributor", "retailer", "wholesaler", "all"
 * - effectiveFrom: date in the past year
 * - effectiveTo: null or date in the future year
 * 
 * @returns fast-check arbitrary for customer discount rule data
 */
export const customerDiscountRuleArbitrary: fc.Arbitrary<CustomerDiscountRule> = fc
  .record({
    id: fc.uuid(),
    customerId: fc.uuid(),
    productId: fc.uuid(),
    volumeThreshold: fc.integer({ min: 1, max: 1000 }),
    discountType: fc.constantFrom(
      "carton_equivalent" as const,
      "percentage" as const,
      "fixed_amount" as const
    ),
    eligibleCustomerType: fc.constantFrom(
      "distributor" as const,
      "retailer" as const,
      "wholesaler" as const,
      "all" as const
    ),
    effectiveFrom: fc.date({
      min: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
      max: new Date(), // now
    }),
    effectiveTo: fc.option(
      fc.date({
        min: new Date(), // now
        max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      }),
      { nil: null }
    ),
  })
  .chain((base) => {
    // Generate discountValue based on discountType
    let discountValueArbitrary: fc.Arbitrary<number>;
    
    switch (base.discountType) {
      case "percentage":
        // Percentage: 0-100
        discountValueArbitrary = fc.float({ min: 0, max: 100, noNaN: true });
        break;
      case "carton_equivalent":
        // Carton equivalent: 0-50 cartons worth of discount
        discountValueArbitrary = fc.float({ min: 0, max: 50, noNaN: true });
        break;
      case "fixed_amount":
        // Fixed amount: 0-5000 PKR
        discountValueArbitrary = fc.float({ min: 0, max: 5000, noNaN: true });
        break;
    }
    
    return discountValueArbitrary.map((discountValue) => ({
      ...base,
      discountValue,
    }));
  });

/**
 * Generates an arbitrary customer discount rule with a specific discount type
 * 
 * Useful when you need to test a specific discount type in isolation.
 * 
 * @param discountType - The discount type to generate
 * @returns fast-check arbitrary for customer discount rule with the specified type
 */
export function customerDiscountRuleWithTypeArbitrary(
  discountType: "carton_equivalent" | "percentage" | "fixed_amount"
): fc.Arbitrary<CustomerDiscountRule> {
  let discountValueArbitrary: fc.Arbitrary<number>;
  
  switch (discountType) {
    case "percentage":
      discountValueArbitrary = fc.float({ min: 0, max: 100, noNaN: true });
      break;
    case "carton_equivalent":
      discountValueArbitrary = fc.float({ min: 0, max: 50, noNaN: true });
      break;
    case "fixed_amount":
      discountValueArbitrary = fc.float({ min: 0, max: 5000, noNaN: true });
      break;
  }
  
  return fc.record({
    id: fc.uuid(),
    customerId: fc.uuid(),
    productId: fc.uuid(),
    volumeThreshold: fc.integer({ min: 1, max: 1000 }),
    discountType: fc.constant(discountType),
    discountValue: discountValueArbitrary,
    eligibleCustomerType: fc.constantFrom(
      "distributor" as const,
      "retailer" as const,
      "wholesaler" as const,
      "all" as const
    ),
    effectiveFrom: fc.date({
      min: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      max: new Date(),
    }),
    effectiveTo: fc.option(
      fc.date({
        min: new Date(),
        max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      }),
      { nil: null }
    ),
  });
}

/**
 * Generates an arbitrary customer discount rule that is currently active
 * 
 * Ensures effectiveFrom is in the past and effectiveTo is either null or in the future.
 * 
 * @returns fast-check arbitrary for an active customer discount rule
 */
export const activeCustomerDiscountRuleArbitrary: fc.Arbitrary<CustomerDiscountRule> = 
  customerDiscountRuleArbitrary.filter((rule) => {
    const now = new Date();
    return (
      rule.effectiveFrom <= now &&
      (rule.effectiveTo === null || rule.effectiveTo >= now)
    );
  });

/**
 * Generates an arbitrary customer discount rule that is currently inactive
 * 
 * Ensures either effectiveFrom is in the future or effectiveTo is in the past.
 * 
 * @returns fast-check arbitrary for an inactive customer discount rule
 */
export const inactiveCustomerDiscountRuleArbitrary: fc.Arbitrary<CustomerDiscountRule> = fc
  .record({
    id: fc.uuid(),
    customerId: fc.uuid(),
    productId: fc.uuid(),
    volumeThreshold: fc.integer({ min: 1, max: 1000 }),
    discountType: fc.constantFrom(
      "carton_equivalent" as const,
      "percentage" as const,
      "fixed_amount" as const
    ),
    eligibleCustomerType: fc.constantFrom(
      "distributor" as const,
      "retailer" as const,
      "wholesaler" as const,
      "all" as const
    ),
  })
  .chain((base) => {
    // Generate either a future effectiveFrom or a past effectiveTo
    const inactiveDateArbitrary = fc.oneof(
      // Case 1: effectiveFrom in the future (not yet active)
      fc.record({
        effectiveFrom: fc.date({
          min: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
          max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        }),
        effectiveTo: fc.constant(null), // null for future rules
      }),
      // Case 2: effectiveTo in the past (expired)
      fc.record({
        effectiveFrom: fc.date({
          min: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000), // 2 years ago
          max: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
        }),
        effectiveTo: fc.date({
          min: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
          max: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
        }),
      })
    );
    
    return inactiveDateArbitrary.chain((dates) => {
      let discountValueArbitrary: fc.Arbitrary<number>;
      
      switch (base.discountType) {
        case "percentage":
          discountValueArbitrary = fc.float({ min: 0, max: 100, noNaN: true });
          break;
        case "carton_equivalent":
          discountValueArbitrary = fc.float({ min: 0, max: 50, noNaN: true });
          break;
        case "fixed_amount":
          discountValueArbitrary = fc.float({ min: 0, max: 5000, noNaN: true });
          break;
      }
      
      return discountValueArbitrary.map((discountValue) => ({
        ...base,
        ...dates,
        discountValue,
      }));
    });
  });

/**
 * Generates an array of customer discount rules for the same customer and product
 * with different volume thresholds (for testing tiered discounts)
 * 
 * @param customerId - The customer ID
 * @param productId - The product ID
 * @param count - Number of rules to generate (default: 2-5)
 * @returns fast-check arbitrary for an array of tiered discount rules
 */
export function tieredDiscountRulesArbitrary(
  customerId: string,
  productId: string,
  count: { min: number; max: number } = { min: 2, max: 5 }
): fc.Arbitrary<CustomerDiscountRule[]> {
  return fc
    .integer({ min: count.min, max: count.max })
    .chain((numRules) => {
      // Generate unique volume thresholds
      return fc
        .uniqueArray(
          fc.integer({ min: 1, max: 1000 }),
          { minLength: numRules, maxLength: numRules }
        )
        .chain((thresholds) => {
          // Sort thresholds in ascending order
          const sortedThresholds = [...thresholds].sort((a, b) => a - b);
          
          // Generate a rule for each threshold
          return fc.tuple(
            ...sortedThresholds.map((threshold) =>
              customerDiscountRuleArbitrary.map((rule) => ({
                ...rule,
                customerId,
                productId,
                volumeThreshold: threshold,
              }))
            )
          );
        });
    });
}
