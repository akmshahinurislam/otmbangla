import basePreset from '@qravy/config/jest-preset';

export default {
  ...basePreset,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
