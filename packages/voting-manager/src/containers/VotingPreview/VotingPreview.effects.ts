import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useVotingContract } from '../../logic/useVotingContract';
import { useWorkerPreview } from '../WorkersPreview/WorkersPreview.effects';

export const useVotingPreview = () => {
  const [votingKey, setVotingKey] = useState('');
  const [matchResult, setMatchResult] = useState('');
  const { callContract, votingContract } = useVotingContract();
  const { workers, updateNumberOfWorkers, updateWorkers } = useWorkerPreview();

  const [voting, setVoting] = useState<{
    ended?: boolean;
    started?: boolean;
    winningMatch?: string;
    workersToVote?: Record<string, string>;
  }>({});

  const updateActiveVoting = useCallback(async () => {
    const voting = await votingContract.matchInputToVoting(votingKey);
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

  return {
    vote,
    setVotingKey,
    workers,
    voting,
    votingKey,
    matchResult,
    setMatchResult,
  };
};
