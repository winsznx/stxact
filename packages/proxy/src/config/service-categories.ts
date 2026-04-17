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
