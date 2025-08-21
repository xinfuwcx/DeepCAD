/* Temporary frontend ESLint config to unblock inline style rule during refactor */
module.exports = {
  root: false,
  overrides: [
    {
      files: ['src/**/*.{ts,tsx}'],
      rules: {
        // Allow inline styles temporarily; we will migrate to CSS Modules/styled soon
        'react/jsx-no-inline-styles': 'off',
        // Some custom linters may map to this generic message; ensure it's off
        '@deepcad/no-inline-styles': 'off'
      }
    }
  ]
};
