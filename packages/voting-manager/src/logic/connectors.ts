import { initializeConnector } from '@web3-react/core';
import { MetaMask } from '@web3-react/metamask';

export const [MetaMaskConnector, useMetaMaskConnector] = initializeConnector(
  (actions) => new MetaMask(actions),
);
