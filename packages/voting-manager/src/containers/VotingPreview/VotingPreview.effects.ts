import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useVotingContract } from '../../logic/useVotingContract';
import { useWorkerPreview } from '../WorkersPreview/WorkersPreview.effects';

export const useVotingPreview = () => {
  const [votingKey, setVotingKey] = useState('');
  const [matchResult, setMatchResult] = useState('');
  const { callContract, votingContract } = useVotingContract();
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
    const numberOfMatchInputs = await votingContract.numberOfMatchInputs();
    setNumberOfVotings(numberOfMatchInputs.toNumber());
  }, [votingContract]);

  const updateVotingKeys = useCallback(async () => {
    const votingKeys = await Promise.all(
      new Array(numberOfVotings)
        .fill(0)
        .map(async (_, index) => await votingContract.matchInputs(index)),
    );

    setVotingKeys(votingKeys);
  }, [numberOfVotings, votingContract]);

  const updateActiveVoting = useCallback(async () => {
    const voting = await votingContract.matchInputToVoting(votingKey);
    console.log(voting);
    const workersToVote = Object.fromEntries(
      await Promise.all(
        workers.map(async (worker) => [
          worker,
          await votingContract.getWorkerVote(votingKey, worker),
        ]),
      ),
    );
    setVoting({ ...voting, workersToVote });
  }, [votingContract, votingKey, workers]);

  const vote = async (matchResult: string) => {
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
  };

  useEffect(() => {
    updateActiveVoting();
  }, [updateActiveVoting]);

  useEffect(() => {
    updateNumberOfVotings();
  }, [updateNumberOfVotings]);

  useEffect(() => {
    updateVotingKeys();
  }, [updateVotingKeys]);

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
