import { getSelectedConnector } from '@web3-react/core';
import { MetaMaskConnector, useMetaMaskConnector } from './connectors';
import chains from './chains.json';

export type ChainMetadata = {
  name: string;
  chain: string;
  rpc: string[];
  faucets: string[];
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  infoURL: string;
  shortName: string;
  chainId: number;
  networkId: number;
  explorers?: {
    name: string;
    url: string;
    standard: string;
  }[];
};

export const useSelectedChain = (): null | ChainMetadata => {
  const { useSelectedWeb3React, useSelectedProvider } = getSelectedConnector([
    MetaMaskConnector,
    useMetaMaskConnector,
  ]);

  const provider = useSelectedProvider(MetaMaskConnector);
  const { chainId } = useSelectedWeb3React(MetaMaskConnector, provider);

  const chain = chains.find((chain) => chain.chainId === chainId);

  return chain ?? null;
};
