import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useVotingContract } from '../../logic/useVotingContract';

export const useWorkerPreview = () => {
  const [workers, setWorkers] = useState<string[]>([]);
  const [workerAddress, setWorkerAddress] = useState<string>('');
  const [numberOfWorkers, setNumberOfWorkers] = useState(0);
  const { votingContract, callContract } = useVotingContract();

  const updateNumberOfWorkers = useCallback(async () => {
    const numberOfWorkers = await votingContract.numberOfWorkers();
    setNumberOfWorkers(numberOfWorkers.toNumber());
  }, [votingContract]);

  const updateWorkers = useCallback(async () => {
    const fetchedWorkers = await Promise.all(
      new Array(numberOfWorkers)
        .fill(null)
        .map(async (_, index) => await votingContract.workers(index)),
    );
    setWorkers(fetchedWorkers);
  }, [votingContract, numberOfWorkers]);

  const addWorker = async (workerAddress: string) => {
    await callContract(() => votingContract.addWorker(workerAddress), {
      onSuccess: () => {
        toast('Worker added!', { type: 'success' });
        updateNumberOfWorkers();
        updateWorkers();
      },
      onError: (e) => {
        toast(e.data?.message ?? e.message, { type: 'error' });
      },
    });
  };

  const deleteWorker = async (workerAddress: string) => {
    await callContract(() => votingContract.removeWorker(workerAddress), {
      onSuccess: () => {
        toast('Worker removed!', { type: 'success' });
        updateNumberOfWorkers();
        updateWorkers();
      },
      onError: (e) => {
        toast(e.data?.message ?? e.message, { type: 'error' });
      },
    });
  };

  useEffect(() => {
    updateNumberOfWorkers();
    updateWorkers();
  }, [updateNumberOfWorkers, updateWorkers]);

  return {
    addWorker,
    workers,
    numberOfWorkers,
    setWorkerAddress,
    deleteWorker,
    workerAddress,
    updateNumberOfWorkers,
    updateWorkers,
  };
};
