import { MetaMaskConnector } from '../logic/connectors';
import React from 'react';
import { Button } from '@mui/material';
import { useStatus } from '../logic/useStatus';

export const ConnectButton = () => {
  const { connected, error, activating } = useStatus();

  if (error) {
    return (
      <Button
        variant='contained'
        color='secondary'
        onClick={() => {
          MetaMaskConnector.activate();
        }}
      >
        Try Again?
      </Button>
    );
  }

  if (connected) {
    return (
      <Button
        variant='contained'
        color='secondary'
        onClick={() => {
          if (MetaMaskConnector?.deactivate) {
            MetaMaskConnector.deactivate();
          }
        }}
        disabled={!MetaMaskConnector.deactivate}
      >
        {Boolean(MetaMaskConnector.deactivate) ? 'Disconnect' : 'Connected'}
      </Button>
    );
  }

  return (
    <Button
      variant='contained'
      color='secondary'
      onClick={() => {
        if (!activating) {
          MetaMaskConnector.activate();
        }
      }}
      disabled={activating}
    >
      {activating ? 'Connecting...' : 'Activate'}
    </Button>
  );
};
