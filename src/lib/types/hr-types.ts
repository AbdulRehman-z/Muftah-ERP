export type AllowanceConfig = {
  id: string; // e.g., "houseRent", "bikeMaintenance", "technical"
  name: string; // Display name
  amount: number; // The actual amount in PKR
};

// Common allowances for template ease
export const STANDARD_ALLOWANCES: AllowanceConfig[] = [
  { id: "houseRent", name: "House Rent", amount: 0 },
  { id: "utilities", name: "Utilities", amount: 0 },
  { id: "bikeMaintenance", name: "Bike Maintenance", amount: 0 },
  { id: "mobile", name: "Mobile Allowance", amount: 0 },
  { id: "technical", name: "Technical Allowance", amount: 0 },
  { id: "conveyance", name: "Conveyance Allowance", amount: 0 },
  { id: "fuel", name: "Fuel Allowance", amount: 0 },
  { id: "special", name: "Special Allowance", amount: 0 },
  { id: "nightShift", name: "Night Shift Allowance", amount: 0 },
];
