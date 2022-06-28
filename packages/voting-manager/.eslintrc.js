module.exports = {
  extends: "@leocode/eslint-config/react",
  parserOptions: {
    project: "./tsconfig.json",
  },
  rules: {
    '@typescript-eslint/return-await' : 'off'
  }
};
