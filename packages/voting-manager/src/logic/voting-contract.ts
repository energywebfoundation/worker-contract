if (!process.env.REACT_APP_VOTING_CONTRACT_ADDRESS) {
  throw new Error('No voting contract address set');
}
export const VOTING_CONTRACT_ADDRESS = process.env.REACT_APP_VOTING_CONTRACT_ADDRESS!;