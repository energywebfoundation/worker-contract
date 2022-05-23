import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useVotingContract } from '../../logic/useVotingContract';

export const useWorkerPreview = () => {
  const [workers, setWorkers] = useState<string[]>([]);
  const [workerAddress, setWorkerAddress] = useState<string>('');
  const [numberOfWorkers, setNumberOfWorkers] = useState(0);
  const { isLoading, votingContract, callContract, getContractProperty } = useVotingContract();

  const updateNumberOfWorkers = useCallback(async () => {
    if (votingContract) {
      const numberOfWorkers = await getContractProperty(async () => await votingContract.numberOfWorkers());
      setNumberOfWorkers(numberOfWorkers.toNumber());
    }
  }, [getContractProperty, votingContract]);

  const updateWorkers = useCallback(async () => {
    if (votingContract) {
      const fetchedWorkers = await Promise.all(
        new Array(numberOfWorkers)
          .fill(null)
          .map(async (_, index) => await getContractProperty(async () => await votingContract.workers(index))),
      );
      setWorkers(fetchedWorkers);
    }
  }, [getContractProperty, votingContract, numberOfWorkers]);

  const addWorker = async (workerAddress: string) => {
    if (votingContract) {
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
    }
  };

  const deleteWorker = async (workerAddress: string) => {
    if (votingContract) {
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
    }
  };

  useEffect(() => {
    if (votingContract) {
      updateNumberOfWorkers();
      updateWorkers();
    }
  }, [votingContract, updateNumberOfWorkers, updateWorkers]);

  return {
    addWorker,
    workers,
    numberOfWorkers,
    setWorkerAddress,
    deleteWorker,
    workerAddress,
    updateNumberOfWorkers,
    updateWorkers,
    isLoading,
  };
};
