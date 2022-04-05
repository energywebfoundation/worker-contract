module.exports = {
    extends: ["@leocode/eslint-config/node"],
    parserOptions: {
        project: `${__dirname}/tsconfig.json`,
    },
    rules: {
        "@typescript-eslint/no-unused-vars": [
            "warn",
            {vars: "all", ignoreRestSiblings: true},
        ],
    },
};