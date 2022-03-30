module.exports = {
  extends: ['@leocode/eslint-config/node'],
  ignorePatterns: '**/client/**/*',
  parserOptions: {
    project: `${__dirname}/tsconfig.json`,
  },
};
