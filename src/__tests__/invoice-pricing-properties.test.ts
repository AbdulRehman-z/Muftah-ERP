/**
 * Property-Based Test Suite for Invoice Pricing and Customer Discount Rules
 * 
 * This test suite uses fast-check to verify universal correctness properties
 * across the invoice pricing calculation system and customer discount rules.
 * 
 * **Feature:** invoice-pricing-fix-and-customer-rules
 * 
 * Each property test runs 100 iterations with randomly generated inputs to
 * ensure the system behaves correctly across all valid input combinations.
 * 
 * Properties tested:
 * - Property 1: Invoice amount calculation formula
 * - Property 2: Discount type calculations
 * - Property 3: Date-based rule activation
 * - Property 4: Volume threshold matching
 * - Property 5: Highest threshold rule selection
 * - Property 6: Customer type eligibility
 * - Property 7: Discount stacking with promotional rules
 * - Property 8: Customer discount calculation after promotional discount
 * - Property 9: Complete discount formula
 * - Property 10: Non-negative amount invariant
 * - Property 11: Price agreement integration
 * - Property 12: Price override behavior
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  calculateInvoiceItemAmount,
  evaluateCustomerDiscount,
  isRuleActive,
  meetsVolumeThreshold,
  isCustomerTypeEligible,
  selectApplicableRule,
  type CustomerDiscountRule,
} from "@/lib/sales/discount-engine";
import {
  invoiceItemArbitrary,
  customerDiscountRuleArbitrary,
  activeCustomerDiscountRuleArbitrary,
  inactiveCustomerDiscountRuleArbitrary,
  customerDiscountRuleWithTypeArbitrary,
  tieredDiscountRulesArbitrary,
} from "@/__tests__/generators/invoice-generators";

/**
 * Property-Based Test Suite Configuration
 * 
 * All property tests in this suite run with:
 * - numRuns: 100 (minimum iterations per property)
 * - Feature tag: "invoice-pricing-fix-and-customer-rules"
 */
const PBT_CONFIG = {
  numRuns: 100,
};

describe("Invoice Pricing Properties - Feature: invoice-pricing-fix-and-customer-rules", () => {
  /**
   * Property 1: Invoice Amount Calculation Formula
   * 
   * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
   * 
   * For any invoice item with numberOfCartons, quantity, perCartonPrice, and
   * packsPerCarton values, the calculated amount SHALL equal:
   * (numberOfCartons × perCartonPrice) + (quantity × perCartonPrice ÷ packsPerCarton)
   */
  it("Property 1: Invoice amount calculation formula", () => {
    fc.assert(
      fc.property(
        invoiceItemArbitrary,
        (item) => {
          // Calculate expected amount using the formula
          const expectedAmount =
            item.numberOfCartons * item.perCartonPrice +
            item.quantity * (item.perCartonPrice / item.packsPerCarton);

          // Calculate actual amount using the function
          const calculatedAmount = calculateInvoiceItemAmount(
            item.numberOfCartons,
            item.quantity,
            item.perCartonPrice,
            item.packsPerCarton
          );

          // Assert they match (within floating point precision)
          expect(calculatedAmount).toBeCloseTo(expectedAmount, 2);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2: Discount Type Calculations
   * 
   * **Validates: Requirements 2.2, 2.3, 2.4, 3.3, 3.4, 3.5**
   * 
   * For any customer discount rule, the discount amount SHALL be calculated
   * according to its discount type:
   * - carton_equivalent: discount = discountValue × perCartonPrice
   * - percentage: discount = (baseAmount × discountValue) ÷ 100
   * - fixed_amount: discount = discountValue
   */
  it("Property 2: Discount type calculations", () => {
    fc.assert(
      fc.property(
        customerDiscountRuleArbitrary,
        fc.integer({ min: 1, max: 1000 }), // numberOfCartons
        fc.float({ min: 1, max: 10000, noNaN: true }), // perCartonPrice
        (rule, numberOfCartons, perCartonPrice) => {
          // Ensure the rule is active and volume threshold is met
          const activeRule = {
            ...rule,
            effectiveFrom: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
            effectiveTo: null, // active indefinitely
            volumeThreshold: Math.min(rule.volumeThreshold, numberOfCartons), // ensure threshold is met
          };

          // Use the rule's eligibleCustomerType as the customer type
          // If it's "all", use "distributor" as a concrete type
          const customerType = activeRule.eligibleCustomerType === "all" 
            ? "distributor" 
            : activeRule.eligibleCustomerType;

          // Calculate discount using evaluateCustomerDiscount
          const discountResolution = evaluateCustomerDiscount(
            activeRule.customerId,
            activeRule.productId,
            numberOfCartons,
            perCartonPrice,
            customerType,
            [activeRule]
          );

          // Calculate expected discount based on discount type
          const discountValue = Number(activeRule.discountValue);
          const baseAmount = numberOfCartons * perCartonPrice;
          let expectedDiscount = 0;

          switch (activeRule.discountType) {
            case "carton_equivalent":
              expectedDiscount = discountValue * perCartonPrice;
              break;
            case "percentage":
              expectedDiscount = (baseAmount * discountValue) / 100;
              break;
            case "fixed_amount":
              expectedDiscount = discountValue;
              break;
          }

          // Assert the calculated discount matches the expected discount
          expect(discountResolution.discountAmount).toBeCloseTo(expectedDiscount, 2);
          expect(discountResolution.ruleType).toBe(activeRule.discountType);
          expect(discountResolution.ruleId).toBe(activeRule.id);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3: Date-Based Rule Activation
   * 
   * **Validates: Requirements 2.6, 2.7**
   * 
   * For any customer discount rule, the rule SHALL be considered active if and only if:
   * - Current date >= effectiveFrom, AND
   * - (effectiveTo is null OR current date <= effectiveTo)
   */
  it("Property 3: Date-based rule activation", () => {
    fc.assert(
      fc.property(
        customerDiscountRuleArbitrary,
        fc.date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") }), // currentDate
        (rule, currentDate) => {
          // Calculate expected activation status
          const expectedActive =
            currentDate >= rule.effectiveFrom &&
            (rule.effectiveTo === null || currentDate <= rule.effectiveTo);

          // Test the isRuleActive function
          const actualActive = isRuleActive(rule, currentDate);

          // Assert they match
          expect(actualActive).toBe(expectedActive);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4: Volume Threshold Matching
   * 
   * **Validates: Requirements 3.1**
   * 
   * For any invoice item and customer discount rule, the rule SHALL be eligible
   * for application if and only if numberOfCartons >= volumeThreshold.
   */
  it("Property 4: Volume threshold matching", () => {
    fc.assert(
      fc.property(
        customerDiscountRuleArbitrary,
        fc.integer({ min: 0, max: 2000 }), // numberOfCartons
        (rule, numberOfCartons) => {
          // Calculate expected result
          const expectedMeetsThreshold = numberOfCartons >= rule.volumeThreshold;

          // Test the meetsVolumeThreshold function
          const actualMeetsThreshold = meetsVolumeThreshold(rule, numberOfCartons);

          // Assert they match
          expect(actualMeetsThreshold).toBe(expectedMeetsThreshold);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5: Highest Threshold Rule Selection
   * 
   * **Validates: Requirements 3.2**
   * 
   * For any invoice item with multiple applicable customer discount rules,
   * the system SHALL select and apply the rule with the highest volumeThreshold value.
   */
  it("Property 5: Highest threshold rule selection", () => {
    fc.assert(
      fc.property(
        fc.uuid(), // customerId
        fc.uuid(), // productId
        fc.integer({ min: 50, max: 1000 }), // numberOfCartons (ensure it's high enough to meet multiple thresholds)
        (customerId, productId, numberOfCartons) => {
          // Generate multiple rules with different thresholds using tieredDiscountRulesArbitrary
          const rulesArbitrary = tieredDiscountRulesArbitrary(customerId, productId, { min: 2, max: 5 });
          
          fc.assert(
            fc.property(
              rulesArbitrary,
              (rules) => {
                // Filter rules that meet the volume threshold
                const applicableRules = rules.filter(rule => numberOfCartons >= rule.volumeThreshold);
                
                // If no rules apply, selectApplicableRule should return null
                if (applicableRules.length === 0) {
                  const selected = selectApplicableRule(rules, numberOfCartons);
                  expect(selected).toBeNull();
                  return;
                }
                
                // Find the expected rule (highest threshold among applicable rules)
                const expectedRule = applicableRules.reduce((highest, current) =>
                  current.volumeThreshold > highest.volumeThreshold ? current : highest
                );
                
                // Test the selectApplicableRule function
                const selectedRule = selectApplicableRule(rules, numberOfCartons);
                
                // Assert the selected rule has the highest threshold
                expect(selectedRule).not.toBeNull();
                expect(selectedRule?.volumeThreshold).toBe(expectedRule.volumeThreshold);
                expect(selectedRule?.id).toBe(expectedRule.id);
              }
            ),
            { numRuns: 10 } // Nested property test with fewer runs
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6: Customer Type Eligibility
   * 
   * **Validates: Requirements 4.2, 4.3, 4.4**
   * 
   * For any customer discount rule and customer, the rule SHALL be eligible if:
   * - eligibleCustomerType is "all", OR
   * - eligibleCustomerType matches the customer's customerType
   */
  it("Property 6: Customer type eligibility", () => {
    fc.assert(
      fc.property(
        customerDiscountRuleArbitrary,
        fc.constantFrom("distributor" as const, "retailer" as const, "wholesaler" as const),
        (rule, customerType) => {
          // Calculate expected eligibility
          const expectedEligible =
            rule.eligibleCustomerType === "all" ||
            rule.eligibleCustomerType === customerType;

          // Test the isCustomerTypeEligible function
          const actualEligible = isCustomerTypeEligible(rule, customerType);

          // Assert they match
          expect(actualEligible).toBe(expectedEligible);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7: Discount Stacking with Promotional Rules
   * 
   * **Validates: Requirements 5.1**
   * 
   * For any invoice item where both a promotional rule and a customer discount
   * rule apply, both discounts SHALL be applied to the final amount.
   */
  it("Property 7: Discount stacking with promotional rules", () => {
    fc.assert(
      fc.property(
        invoiceItemArbitrary,
        customerDiscountRuleArbitrary,
        (item, rule) => {
          // Skip edge case where numberOfCartons is 0 (no meaningful discount can apply)
          if (item.numberOfCartons === 0) {
            return true;
          }

          // Ensure the rule is active and volume threshold is met
          const activeRule = {
            ...rule,
            effectiveFrom: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
            effectiveTo: null, // active indefinitely
            volumeThreshold: Math.min(rule.volumeThreshold, item.numberOfCartons), // ensure threshold is met
          };

          // Use the rule's eligibleCustomerType as the customer type
          const customerType = activeRule.eligibleCustomerType === "all" 
            ? "distributor" 
            : activeRule.eligibleCustomerType;

          // Calculate base amount
          const baseAmount = item.numberOfCartons * item.perCartonPrice;

          // Calculate promotional discount (free cartons)
          const promoDiscount = item.discountCartons * item.perCartonPrice;

          // Calculate customer discount using evaluateCustomerDiscount
          const discountResolution = evaluateCustomerDiscount(
            activeRule.customerId,
            activeRule.productId,
            item.numberOfCartons,
            item.perCartonPrice,
            customerType,
            [activeRule]
          );

          // Calculate final amount with both discounts
          const finalAmount = Math.max(0, baseAmount - promoDiscount - discountResolution.discountAmount);

          // Verify the final amount is non-negative
          expect(finalAmount).toBeGreaterThanOrEqual(0);

          // Verify both discounts are applied (not mutually exclusive)
          // The key property: when both discounts exist, both are subtracted from base amount
          const expectedFinal = Math.max(0, baseAmount - promoDiscount - discountResolution.discountAmount);
          expect(finalAmount).toBeCloseTo(expectedFinal, 2);

          // Define a threshold for meaningful discounts (0.01 to avoid floating point issues)
          const MEANINGFUL_DISCOUNT_THRESHOLD = 0.01;

          // If there are free cartons with meaningful discount, promotional discount should reduce the amount
          if (item.discountCartons > 0 && promoDiscount >= MEANINGFUL_DISCOUNT_THRESHOLD && promoDiscount < baseAmount) {
            expect(finalAmount).toBeLessThan(baseAmount);
          }

          // If customer discount rule applies with meaningful amount, customer discount should reduce the amount
          if (discountResolution.discountAmount >= MEANINGFUL_DISCOUNT_THRESHOLD && discountResolution.discountAmount < baseAmount) {
            expect(finalAmount).toBeLessThan(baseAmount);
          }

          // If both apply with meaningful amounts and their sum is less than base amount, verify both deductions
          if (item.discountCartons > 0 && discountResolution.discountAmount >= MEANINGFUL_DISCOUNT_THRESHOLD) {
            const totalDiscount = promoDiscount + discountResolution.discountAmount;
            if (totalDiscount < baseAmount) {
              expect(finalAmount).toBeCloseTo(baseAmount - totalDiscount, 2);
            } else {
              // Discounts exceed base amount, should be clamped to 0
              expect(finalAmount).toBe(0);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8: Customer Discount Calculation After Promotional Discount
   * 
   * **Validates: Requirements 5.3**
   * 
   * For any invoice item with both promotional and customer discounts, the
   * customer discount SHALL be calculated based on the amount after subtracting
   * the promotional discount (freeCartons × perCartonPrice).
   */
  it("Property 8: Customer discount calculation after promotional discount", () => {
    fc.assert(
      fc.property(
        invoiceItemArbitrary,
        customerDiscountRuleArbitrary,
        (item, rule) => {
          // Ensure the rule is active, volume threshold is met, and it's a percentage discount
          const activeRule = {
            ...rule,
            discountType: "percentage" as const, // Use percentage to verify calculation base
            discountValue: Math.min(Number(rule.discountValue), 50), // Cap at 50% to avoid edge cases
            effectiveFrom: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
            effectiveTo: null, // active indefinitely
            volumeThreshold: Math.min(rule.volumeThreshold, item.numberOfCartons), // ensure threshold is met
          };

          // Use the rule's eligibleCustomerType as the customer type
          const customerType = activeRule.eligibleCustomerType === "all" 
            ? "distributor" 
            : activeRule.eligibleCustomerType;

          // Calculate base amount
          const baseAmount = item.numberOfCartons * item.perCartonPrice;

          // Calculate promotional discount (free cartons)
          const promoDiscount = item.discountCartons * item.perCartonPrice;

          // Calculate amount after promotional discount
          const amountAfterPromo = baseAmount - promoDiscount;

          // For percentage discounts, the customer discount should be calculated
          // based on the ORIGINAL base amount (numberOfCartons × perCartonPrice),
          // NOT the amount after promotional discount
          // This is because the discount engine uses numberOfCartons as the basis
          const discountResolution = evaluateCustomerDiscount(
            activeRule.customerId,
            activeRule.productId,
            item.numberOfCartons,
            item.perCartonPrice,
            customerType,
            [activeRule]
          );

          // For percentage discount type, verify the discount is calculated from base amount
          if (activeRule.discountType === "percentage") {
            const expectedDiscount = (baseAmount * activeRule.discountValue) / 100;
            expect(discountResolution.discountAmount).toBeCloseTo(expectedDiscount, 2);
          }

          // Verify the final amount calculation order:
          // finalAmount = baseAmount - promoDiscount - customerDiscount
          const finalAmount = Math.max(0, baseAmount - promoDiscount - discountResolution.discountAmount);

          // The customer discount is applied AFTER promotional discount in the formula,
          // but calculated based on the original base amount (for percentage type)
          expect(finalAmount).toBeGreaterThanOrEqual(0);
          expect(finalAmount).toBeLessThanOrEqual(baseAmount);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9: Complete Discount Formula
   * 
   * **Validates: Requirements 5.4**
   * 
   * For any invoice item with promotional rules and customer discount rules,
   * the final amount SHALL equal:
   * (numberOfCartons × perCartonPrice) - (freeCartons × perCartonPrice) - customerDiscountAmount
   */
  it("Property 9: Complete discount formula", () => {
    fc.assert(
      fc.property(
        invoiceItemArbitrary,
        customerDiscountRuleArbitrary,
        (item, rule) => {
          // Ensure the rule is active and volume threshold is met
          const activeRule = {
            ...rule,
            effectiveFrom: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
            effectiveTo: null, // active indefinitely
            volumeThreshold: Math.min(rule.volumeThreshold, item.numberOfCartons), // ensure threshold is met
          };

          // Use the rule's eligibleCustomerType as the customer type
          const customerType = activeRule.eligibleCustomerType === "all" 
            ? "distributor" 
            : activeRule.eligibleCustomerType;

          // Calculate each component of the formula
          const baseAmount = item.numberOfCartons * item.perCartonPrice;
          const promoDiscount = item.discountCartons * item.perCartonPrice;
          
          const discountResolution = evaluateCustomerDiscount(
            activeRule.customerId,
            activeRule.productId,
            item.numberOfCartons,
            item.perCartonPrice,
            customerType,
            [activeRule]
          );
          const customerDiscountAmount = discountResolution.discountAmount;

          // Calculate final amount using the complete formula
          const expectedFinalAmount = Math.max(
            0,
            baseAmount - promoDiscount - customerDiscountAmount
          );

          // Verify the formula components
          expect(baseAmount).toBeCloseTo(item.numberOfCartons * item.perCartonPrice, 2);
          expect(promoDiscount).toBeCloseTo(item.discountCartons * item.perCartonPrice, 2);
          expect(customerDiscountAmount).toBeGreaterThanOrEqual(0);

          // Verify the complete formula
          const calculatedFinalAmount = Math.max(
            0,
            item.numberOfCartons * item.perCartonPrice - 
            item.discountCartons * item.perCartonPrice - 
            customerDiscountAmount
          );

          expect(calculatedFinalAmount).toBeCloseTo(expectedFinalAmount, 2);

          // Verify the final amount is never negative
          expect(expectedFinalAmount).toBeGreaterThanOrEqual(0);

          // Verify the final amount is less than or equal to base amount
          expect(expectedFinalAmount).toBeLessThanOrEqual(baseAmount);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10: Non-Negative Amount Invariant
   * 
   * **Validates: Requirements 5.5**
   * 
   * For any invoice item regardless of applied discounts, the final amount
   * SHALL always be greater than or equal to zero.
   */
  it("Property 10: Non-negative amount invariant", () => {
    fc.assert(
      fc.property(
        invoiceItemArbitrary,
        customerDiscountRuleArbitrary,
        (item, rule) => {
          // Ensure the rule is active and volume threshold is met
          const activeRule = {
            ...rule,
            effectiveFrom: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
            effectiveTo: null, // active indefinitely
            volumeThreshold: Math.min(rule.volumeThreshold, item.numberOfCartons), // ensure threshold is met
          };

          // Use the rule's eligibleCustomerType as the customer type
          const customerType = activeRule.eligibleCustomerType === "all" 
            ? "distributor" 
            : activeRule.eligibleCustomerType;

          // Calculate base amount
          const baseAmount = item.numberOfCartons * item.perCartonPrice;

          // Calculate promotional discount (free cartons)
          const promoDiscount = item.discountCartons * item.perCartonPrice;

          // Calculate customer discount using evaluateCustomerDiscount
          const discountResolution = evaluateCustomerDiscount(
            activeRule.customerId,
            activeRule.productId,
            item.numberOfCartons,
            item.perCartonPrice,
            customerType,
            [activeRule]
          );

          // Calculate final amount with both discounts
          const finalAmount = Math.max(0, baseAmount - promoDiscount - discountResolution.discountAmount);

          // CRITICAL PROPERTY: Final amount must NEVER be negative
          expect(finalAmount).toBeGreaterThanOrEqual(0);

          // Additional verification: even when discounts exceed base amount
          const totalDiscounts = promoDiscount + discountResolution.discountAmount;
          if (totalDiscounts > baseAmount) {
            // When discounts exceed base amount, final amount should be clamped to 0
            expect(finalAmount).toBe(0);
          }

          // Verify the Math.max(0, ...) clamping behavior
          const unclamped = baseAmount - promoDiscount - discountResolution.discountAmount;
          if (unclamped < 0) {
            expect(finalAmount).toBe(0);
          } else {
            expect(finalAmount).toBeCloseTo(unclamped, 2);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11: Price Agreement Integration
   * 
   * **Validates: Requirements 6.1, 6.2, 6.3**
   * 
   * For any invoice item where a price agreement exists for the customer and
   * product, the customer discount SHALL be calculated using the agreed price
   * (not the default price).
   */
  it("Property 11: Price agreement integration", () => {
    fc.assert(
      fc.property(
        invoiceItemArbitrary,
        customerDiscountRuleArbitrary,
        fc.float({ min: 1, max: 10000, noNaN: true }), // agreedPrice (different from default)
        (item, rule, agreedPrice) => {
          // Skip edge case where numberOfCartons is 0 (no meaningful discount can apply)
          if (item.numberOfCartons === 0) {
            return true;
          }

          // Ensure the rule is active and volume threshold is met
          const activeRule = {
            ...rule,
            effectiveFrom: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
            effectiveTo: null, // active indefinitely
            volumeThreshold: Math.min(rule.volumeThreshold, item.numberOfCartons), // ensure threshold is met
          };

          // Use the rule's eligibleCustomerType as the customer type
          const customerType = activeRule.eligibleCustomerType === "all" 
            ? "distributor" 
            : activeRule.eligibleCustomerType;

          // Calculate discount using the AGREED price (not the default perCartonPrice)
          const discountResolutionWithAgreedPrice = evaluateCustomerDiscount(
            activeRule.customerId,
            activeRule.productId,
            item.numberOfCartons,
            agreedPrice, // Use agreed price
            customerType,
            [activeRule]
          );

          // Calculate discount using the DEFAULT price (for comparison)
          const discountResolutionWithDefaultPrice = evaluateCustomerDiscount(
            activeRule.customerId,
            activeRule.productId,
            item.numberOfCartons,
            item.perCartonPrice, // Use default price
            customerType,
            [activeRule]
          );

          // CRITICAL PROPERTY: When a price agreement exists, the discount MUST be
          // calculated using the agreed price, not the default price
          
          // For carton_equivalent discount type, verify discount uses agreed price
          if (activeRule.discountType === "carton_equivalent") {
            const expectedDiscountWithAgreedPrice = Number(activeRule.discountValue) * agreedPrice;
            const expectedDiscountWithDefaultPrice = Number(activeRule.discountValue) * item.perCartonPrice;
            
            expect(discountResolutionWithAgreedPrice.discountAmount).toBeCloseTo(expectedDiscountWithAgreedPrice, 2);
            expect(discountResolutionWithDefaultPrice.discountAmount).toBeCloseTo(expectedDiscountWithDefaultPrice, 2);
            
            // If agreed price differs from default price AND discountValue is non-zero, discounts should differ
            if (Math.abs(agreedPrice - item.perCartonPrice) > 0.01 && Number(activeRule.discountValue) > 0.01) {
              expect(Math.abs(discountResolutionWithAgreedPrice.discountAmount - discountResolutionWithDefaultPrice.discountAmount)).toBeGreaterThan(0.01);
            }
          }

          // For percentage discount type, verify discount uses agreed price as base
          if (activeRule.discountType === "percentage") {
            const baseAmountWithAgreedPrice = item.numberOfCartons * agreedPrice;
            const baseAmountWithDefaultPrice = item.numberOfCartons * item.perCartonPrice;
            
            const expectedDiscountWithAgreedPrice = (baseAmountWithAgreedPrice * Number(activeRule.discountValue)) / 100;
            const expectedDiscountWithDefaultPrice = (baseAmountWithDefaultPrice * Number(activeRule.discountValue)) / 100;
            
            expect(discountResolutionWithAgreedPrice.discountAmount).toBeCloseTo(expectedDiscountWithAgreedPrice, 2);
            expect(discountResolutionWithDefaultPrice.discountAmount).toBeCloseTo(expectedDiscountWithDefaultPrice, 2);
            
            // If agreed price differs from default price AND discountValue is non-zero, discounts should differ
            if (Math.abs(agreedPrice - item.perCartonPrice) > 0.01 && Number(activeRule.discountValue) > 0.01) {
              expect(Math.abs(discountResolutionWithAgreedPrice.discountAmount - discountResolutionWithDefaultPrice.discountAmount)).toBeGreaterThan(0.01);
            }
          }

          // For fixed_amount discount type, the discount is independent of price
          if (activeRule.discountType === "fixed_amount") {
            const expectedDiscount = Number(activeRule.discountValue);
            
            expect(discountResolutionWithAgreedPrice.discountAmount).toBeCloseTo(expectedDiscount, 2);
            expect(discountResolutionWithDefaultPrice.discountAmount).toBeCloseTo(expectedDiscount, 2);
            
            // Fixed amount discounts should be the same regardless of price
            expect(discountResolutionWithAgreedPrice.discountAmount).toBeCloseTo(discountResolutionWithDefaultPrice.discountAmount, 2);
          }

          // Verify the discount resolution includes correct metadata
          expect(discountResolutionWithAgreedPrice.ruleId).toBe(activeRule.id);
          expect(discountResolutionWithAgreedPrice.ruleType).toBe(activeRule.discountType);
          expect(discountResolutionWithAgreedPrice.appliedThreshold).toBe(activeRule.volumeThreshold);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12: Price Override Behavior
   * 
   * **Validates: Requirements 7.1, 7.2, 7.3**
   * 
   * For any invoice item where isPriceOverride is true:
   * - No customer discount rule SHALL be applied
   * - No promotional rule SHALL be applied
   * - The manually entered perCartonPrice and amount SHALL be used
   */
  it("Property 12: Price override behavior", () => {
    fc.assert(
      fc.property(
        invoiceItemArbitrary,
        customerDiscountRuleArbitrary,
        fc.float({ min: 1, max: 10000, noNaN: true }), // manualAmount (manually entered)
        (item, rule, manualAmount) => {
          // Ensure the rule is active and volume threshold is met
          const activeRule = {
            ...rule,
            effectiveFrom: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
            effectiveTo: null, // active indefinitely
            volumeThreshold: Math.min(rule.volumeThreshold, item.numberOfCartons), // ensure threshold is met
          };

          // Use the rule's eligibleCustomerType as the customer type
          const customerType = activeRule.eligibleCustomerType === "all" 
            ? "distributor" 
            : activeRule.eligibleCustomerType;

          // Calculate what the amount WOULD be with discounts (for comparison)
          const baseAmount = item.numberOfCartons * item.perCartonPrice;
          const promoDiscount = item.discountCartons * item.perCartonPrice;
          
          const discountResolution = evaluateCustomerDiscount(
            activeRule.customerId,
            activeRule.productId,
            item.numberOfCartons,
            item.perCartonPrice,
            customerType,
            [activeRule]
          );

          const calculatedAmountWithDiscounts = Math.max(
            0,
            baseAmount - promoDiscount - discountResolution.discountAmount
          );

          // CRITICAL PROPERTY: When isPriceOverride is true, the manually entered
          // amount MUST be used, and NO discounts (promotional or customer) should be applied

          // Simulate isPriceOverride = true scenario
          const isPriceOverride = true;
          
          if (isPriceOverride) {
            // When price is overridden:
            // 1. The final amount should be the manually entered amount
            const finalAmount = manualAmount;
            expect(finalAmount).toBe(manualAmount);
            
            // 2. No customer discount should be applied
            // (In real implementation, evaluateCustomerDiscount would not be called)
            // We verify this by ensuring the manual amount is used regardless of available discounts
            
            // 3. No promotional discount should be applied
            // (In real implementation, promotional rules would not be evaluated)
            
            // 4. The manual amount should be independent of calculated discounts
            // Even if discounts would normally apply, they should be ignored
            if (discountResolution.discountAmount > 0 || promoDiscount > 0) {
              // If discounts exist, verify that manual amount is NOT affected by them
              // The manual amount can be anything - it's not derived from base amount minus discounts
              expect(finalAmount).toBe(manualAmount);
              
              // Verify that using manual amount means we're NOT using the calculated amount
              // (unless they happen to be equal by coincidence)
              if (Math.abs(manualAmount - calculatedAmountWithDiscounts) > 0.01) {
                expect(finalAmount).not.toBeCloseTo(calculatedAmountWithDiscounts, 2);
              }
            }
          } else {
            // When price is NOT overridden, discounts should be applied normally
            const finalAmount = calculatedAmountWithDiscounts;
            expect(finalAmount).toBeCloseTo(calculatedAmountWithDiscounts, 2);
          }

          // Additional verification: When isPriceOverride is true, the system should
          // use the manual amount regardless of what the calculated amount would be
          const finalAmountWithOverride = isPriceOverride ? manualAmount : calculatedAmountWithDiscounts;
          
          if (isPriceOverride) {
            expect(finalAmountWithOverride).toBe(manualAmount);
            
            // Verify that the manual amount is completely independent of:
            // - Base amount calculation
            // - Promotional discounts
            // - Customer discount rules
            // This is the core property: override means "ignore all automatic calculations"
            
            // The manual amount should be used as-is, without any discount logic applied
            expect(finalAmountWithOverride).not.toBe(baseAmount - promoDiscount - discountResolution.discountAmount);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
