import { Box, Card, CardContent, Grid, useTheme } from '@mui/material';
import React from 'react';
import { ConnectButton } from '../components/ConnectButton';
import StatusInfo from '../components/StatusInfo';
import { VotingManager } from '../components/VotingManager';
import { useStatus } from '../logic/useStatus';
import { backgroundGradient } from '../common/styling/theme';
import AccountInfo from '../components/AccountInfo';
import ContractInfo from '../components/ContractInfo';

export const Index = () => {
  const { canPerformActions } = useStatus();
  const theme = useTheme();

  return (
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        padding: theme.spacing(4),
        backgroundImage: backgroundGradient,
      }}
    >
      <Box
        maxWidth='md'
        mx='auto'
        sx={{
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box>
                  <StatusInfo />
                </Box>
                <Box>
                  <AccountInfo />
                </Box>
                <ConnectButton />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <ContractInfo />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            {canPerformActions && <VotingManager />}
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default Index;
