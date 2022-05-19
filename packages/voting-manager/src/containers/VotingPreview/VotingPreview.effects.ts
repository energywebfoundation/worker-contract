import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useVotingContract } from '../../logic/useVotingContract';
import { useWorkerPreview } from '../WorkersPreview/WorkersPreview.effects';

export const useVotingPreview = () => {
  const [votingKey, setVotingKey] = useState('');
  const [matchResult, setMatchResult] = useState('');
  const { callContract, votingContract, getContractProperty } =
    useVotingContract();
  const { workers, updateNumberOfWorkers, updateWorkers } = useWorkerPreview();
  const [numberOfVotings, setNumberOfVotings] = useState(0);
  const [votingKeys, setVotingKeys] = useState<string[]>([]);

  const [voting, setVoting] = useState<{
    ended?: boolean;
    started?: boolean;
    winningMatch?: string;
    workersToVote?: Record<string, string>;
  }>({});

  const updateNumberOfVotings = useCallback(async () => {
    if (votingContract) {
      const numberOfMatchInputs = await getContractProperty(
        async () => await votingContract.numberOfMatchInputs(),
      );
      setNumberOfVotings(numberOfMatchInputs.toNumber());
    }
  }, [getContractProperty, votingContract]);

  const updateVotingKeys = useCallback(async () => {
    if (votingContract) {
      const votingKeys = await Promise.all(
        new Array(numberOfVotings)
          .fill(0)
          .map(
            async (_, index) =>
              await getContractProperty(
                async () => await votingContract.matchInputs(index),
              ),
          ),
      );

      setVotingKeys(votingKeys);
    }
  }, [getContractProperty, numberOfVotings, votingContract]);

  const updateActiveVoting = useCallback(async () => {
    if (votingContract) {
      const voting = await getContractProperty(
        async () => await votingContract.matchInputToVoting(votingKey),
      );

      const workersToVote = Object.fromEntries(
        await Promise.all(
          workers.map(async (worker) => [
            worker,
            await getContractProperty(
              async () => await votingContract.getWorkerVote(votingKey, worker),
            ),
          ]),
        ),
      );
      setVoting({ ...voting, workersToVote });
    }
  }, [getContractProperty, votingContract, votingKey, workers]);

  const vote = async (matchResult: string) => {
    if (votingContract) {
      await callContract(() => votingContract.vote(votingKey, matchResult), {
        onSuccess: () => {
          toast('Voted!', { type: 'success' });
          updateNumberOfWorkers();
          updateNumberOfVotings();
          updateWorkers();
          updateActiveVoting();
        },
        onError: (e) => {
          toast(e.data?.message ?? e.message, { type: 'error' });
        },
      });
    }
  };

  useEffect(() => {
    if (votingContract) {
      updateActiveVoting();
    }
  }, [votingContract, updateActiveVoting]);

  useEffect(() => {
    if (votingContract) {
      updateNumberOfVotings();
    }
  }, [votingContract, updateNumberOfVotings]);

  useEffect(() => {
    if (votingContract) {
      updateVotingKeys();
    }
  }, [votingContract, updateVotingKeys]);

  return {
    vote,
    setVotingKey,
    workers,
    voting,
    votingKey,
    matchResult,
    setMatchResult,
    votingKeys,
  };
};
