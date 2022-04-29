module.exports = {
  extends: ['@leocode/eslint-config/node'],
  ignorePatterns: ['.eslintrc.js'],
  parserOptions: {
    project: `${__dirname}/tsconfig.json`,
  },
};
