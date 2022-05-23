declare global {
  interface Window {
    config: {
      VOTING_CONTRACT_ADDRESS: string;
    };
  }
}

const votingAddress = process.env.REACT_APP_VOTING_CONTRACT_ADDRESS ?? window.config.VOTING_CONTRACT_ADDRESS;

if (!votingAddress) {
  throw new Error('No voting contract address set');
}

export const VOTING_CONTRACT_ADDRESS = votingAddress!;