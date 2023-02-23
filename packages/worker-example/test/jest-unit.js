process.env.NODE_ENV = 'test';
process.env.DDHUB_URL = 'http://localhost:3000';
process.env['PORT'] = '3030';
process.env['RPC_HOST'] = 'http://localhost:8545';
process.env['DIAMOND_CONTRACT_ADDRESS'] = '0x5fbdb2315678afecb367f032d93f642f64180aa3';
process.env['WORKER_PRIVATE_KEY'] = '0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba';
process.env['WORKER_BLOCKCHAIN_ADDRESS'] = '0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc';

module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.spec.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
};
