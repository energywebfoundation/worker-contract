import { getSelectedConnector } from '@web3-react/core';
import { MetaMaskConnector, useMetaMaskConnector } from './connectors';
import { useCallback, useEffect, useState } from 'react';
import { BigNumber } from 'ethers';

export const useAccount = () => {
  const { useSelectedAccounts, useSelectedProvider } = getSelectedConnector([
    MetaMaskConnector,
    useMetaMaskConnector,
  ]);
  const accounts = useSelectedAccounts(MetaMaskConnector);
  const provider = useSelectedProvider(MetaMaskConnector);
  const [balance, setBalance] = useState<BigNumber | undefined>(undefined);

  const getBalance = useCallback(async () => {
    const account = accounts?.[0];
    if (provider && account) {
      const balance = await provider.getBalance(account);
      setBalance(balance);
    } else {
      setBalance(BigNumber.from(0));
    }
  }, [accounts?.[0], provider]);

  useEffect(() => {
    getBalance();
  }, [getBalance]);

  return {
    address: accounts?.[0],
    balance,
  };
};
