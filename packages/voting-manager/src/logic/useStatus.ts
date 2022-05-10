import { MetaMaskConnector, useMetaMaskConnector } from './connectors';
import { getSelectedConnector } from '@web3-react/core';

export const useStatus = () => {
  const {
    useSelectedChainId,
    useSelectedAccounts,
    useSelectedError,
    useSelectedIsActivating,
  } = getSelectedConnector([MetaMaskConnector, useMetaMaskConnector]);

  const error = useSelectedError(MetaMaskConnector);
  const chainId = useSelectedChainId(MetaMaskConnector);
  const accounts = useSelectedAccounts(MetaMaskConnector);
  const activating = useSelectedIsActivating(MetaMaskConnector);
  const connected = Boolean(chainId && accounts);

  return {
    connected,
    error,
    activating,
    canPerformActions: connected && !error && !activating,
  };
};
