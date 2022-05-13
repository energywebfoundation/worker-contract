import { ContractTransaction, ethers } from 'ethers';
import { useCallback, useMemo } from 'react';
import { VOTING_CONTRACT_ADDRESS } from './voting-contract';
import { MatchVoting, MatchVoting__factory } from '@energyweb/greenproof-voting-contract';
import { getSelectedConnector } from '@web3-react/core';
import { MetaMaskConnector, useMetaMaskConnector } from './connectors';

type JSONRPCError = {
  code: number;
  message: string;
  data: {
    code: number;
    message: string;
  };
  stack: string;
};

export const useVotingContract = () => {
  const { useSelectedWeb3React, useSelectedProvider } = getSelectedConnector([
    MetaMaskConnector,
    useMetaMaskConnector,
  ]);
  const provider = useSelectedProvider(MetaMaskConnector);
  const { library } = useSelectedWeb3React(MetaMaskConnector, provider);

  const votingContract = useMemo(() => {
    const signer = library?.getSigner();
    return new ethers.Contract(
      VOTING_CONTRACT_ADDRESS,
      MatchVoting__factory.abi,
      signer,
    ) as MatchVoting;
  }, [library]);

  const callContract = useCallback(
    async (
      callFn: () => Promise<ContractTransaction>,
      {
        onSuccess,
        onError,
      }: {
        onSuccess?: () => Promise<void> | void;
        onError?: (e: JSONRPCError) => Promise<void> | void;
      } = {},
    ) => {
      try {
        const transaction = await callFn();
        await transaction.wait(1);
        onSuccess?.();
      } catch (e) {
        onError?.(e as JSONRPCError);
      }
    },
    [],
  );

  return {
    callContract,
    votingContract,
  };
};
