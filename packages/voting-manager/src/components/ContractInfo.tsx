import React from 'react';
import { Typography } from '@mui/material';
import { useVotingContract } from '../logic/useVotingContract';

const ContractInfo = () => {
  const { votingContract } = useVotingContract();

  return (
    <>
      <Typography>Contract address: {votingContract?.address}</Typography>
    </>
  );
};

export default ContractInfo;
