module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  transform: {
    '^.+\\.tsx?$': '<rootDir>/tests/support/ts-transformer.cjs',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/support/setup.cjs'],
  clearMocks: true,
  restoreMocks: true,
  testTimeout: 15000,
};
