import React from 'react';
import { Typography } from '@mui/material';
import { ethers } from 'ethers';
import { useAccount } from '../logic/useAccount';

const AccountInfo = () => {
  const { address, balance } = useAccount();

  return (
    <>
      <Typography>Account: {address}</Typography>
      <Typography>
        Balance: {ethers.utils.formatEther(balance?.toString() ?? '0')} ETH
      </Typography>
    </>
  );
};

export default AccountInfo;
