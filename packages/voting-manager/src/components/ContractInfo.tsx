import React from 'react';
import { Typography } from '@mui/material';
import { ethers } from 'ethers';
import { useAccount } from '../logic/useAccount';
import { useSelectedChain } from '../logic/useSelectedChain';
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
