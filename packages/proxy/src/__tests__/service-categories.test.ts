import { SERVICE_CATEGORIES, isValidServiceCategory } from '../config/service-categories';

describe('service categories', () => {
  it('includes core categories', () => {
    expect(SERVICE_CATEGORIES).toContain('data-api');
    expect(SERVICE_CATEGORIES).toContain('ai-compute');
    expect(SERVICE_CATEGORIES).toContain('storage');
  });

  it('validates known categories', () => {
    expect(isValidServiceCategory('oracle')).toBe(true);
  });

  it('rejects unknown categories', () => {
    expect(isValidServiceCategory('blockchain')).toBe(false);
  });
});


/**
 * Test fixture structure for category validation bounds.
 */
export type ServiceCategoryTestContext = Readonly<{ category: string; valid: boolean }>;
