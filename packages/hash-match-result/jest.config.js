module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    rootDir: `${__dirname}/test`,
    testTimeout: 120000,
    resetMocks: true,
};