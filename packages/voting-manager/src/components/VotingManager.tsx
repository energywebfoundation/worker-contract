import React from 'react';
import { Grid, useTheme } from '@mui/material';
import VotingPreview from '../containers/VotingPreview/VotingPreview';
import WorkersPreview from '../containers/WorkersPreview/WorkersPreview';

export const VotingManager = () => {
  const theme = useTheme();

  return (
    <Grid container spacing={theme.spacing(2)}>
      <Grid item xs={6}>
        <WorkersPreview />
      </Grid>
      <Grid item xs={6}>
        <VotingPreview />
      </Grid>
    </Grid>
  );
};
