import { ContractTransaction, ethers } from 'ethers';
import { useCallback, useMemo } from 'react';
import { VOTING_CONTRACT_ADDRESS } from './voting-contract';
import {
  MatchVoting,
  MatchVoting__factory,
} from '@energyweb/greenproof-voting-contract';
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
    if (library) {
      const signer = library.getSigner();

      return new ethers.Contract(
        VOTING_CONTRACT_ADDRESS,
        MatchVoting__factory.abi,
        signer,
      ) as MatchVoting;
    }

    return null;
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
        console.debug(`${callFn} resulted in transaction ${transaction.hash}`);
        await transaction.wait(1);
        onSuccess?.();
      } catch (e) {
        console.debug(`${callFn} thrown: ${JSON.stringify(e)}`);
        onError?.(e as JSONRPCError);
      }
    },
    [],
  );

  const getContractProperty = useCallback(
    async <T>(
      callFn: () => Promise<T>,
      {
        onSuccess,
        onError,
      }: {
        onSuccess?: () => Promise<void> | void;
        onError?: (e: JSONRPCError) => Promise<void> | void;
      } = {},
    ): Promise<T> => {
      try {
        const result = await callFn();
        console.debug(`${callFn} returned ${result}`);
        onSuccess?.();
        return result;
      } catch (e) {
        onError?.(e as JSONRPCError);
        console.debug(`${callFn} thrown: ${e}`);
        throw e;
      }
    },
    [],
  );

  return {
    callContract,
    votingContract,
    getContractProperty,
  };
};
