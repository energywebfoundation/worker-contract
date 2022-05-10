import React from 'react';
import { useStatus } from '../logic/useStatus';
import { Box } from '@mui/material';

const StatusInfo = () => {
  const { error, connected } = useStatus();

  if (error) {
    return (
      <Box>
        Status: {error.name ?? 'Error'}: {error.message}
      </Box>
    );
  }

  if (connected) {
    return <Box>Status: Connected</Box>;
  }
  return <Box>Status: Disconnected</Box>;
};

export default StatusInfo;
