module.exports = {
  extends: "@leocode/eslint-config/react",
  parserOptions: {
    project: `${__dirname}/tsconfig.json`,
  },
  rules: {
    '@typescript-eslint/return-await' : 'off'
  }
};
