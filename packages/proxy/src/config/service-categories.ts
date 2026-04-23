export const SERVICE_CATEGORIES = [
  'data-api',
  'ai-compute',
  'storage',
  'analytics',
  'oracle',
  'yield',
  'other',
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export function isValidServiceCategory(category: string): category is ServiceCategory {
  return (SERVICE_CATEGORIES as readonly string[]).includes(category);
}


/**
 * Validates if an unknown value is a registered service category.
 */
export const isServiceCategory = (val: unknown, categories: string[]): val is string => typeof val === 'string' && categories.includes(val);
