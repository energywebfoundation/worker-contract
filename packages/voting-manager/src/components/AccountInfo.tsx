import React from 'react';
import { Typography } from '@mui/material';
import { ethers } from 'ethers';
import { useAccount } from '../logic/useAccount';
import { useSelectedChain } from '../logic/useSelectedChain';

const AccountInfo = () => {
  const { address, balance } = useAccount();
  const chain = useSelectedChain();

  return (
    <>
      <Typography>Account: {address}</Typography>
      <Typography>
        {`Balance: ${ethers.utils.formatEther(balance?.toString() ?? '0')} ${
          chain?.nativeCurrency.symbol ?? 'ETH'
        }`}
      </Typography>
    </>
  );
};

export default AccountInfo;
