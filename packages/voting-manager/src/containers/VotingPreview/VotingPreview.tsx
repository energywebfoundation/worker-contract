import React, { FormEvent } from 'react';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  InputLabel,
  List,
  ListItem,
  ListSubheader,
  TextField,
  Typography,
} from '@mui/material';
import CreatableSelect from 'react-select/creatable';
import { useVotingPreview } from './VotingPreview.effects';
import { formatBoolean } from '../../logic/value-formatters';

const VotingPreview = ({}) => {
  const {
    vote,
    setVotingKey,
    votingKey,
    voting,
    workers,
    setMatchResult,
    matchResult,
    votingKeys,
  } = useVotingPreview();

  return (
    <Card id='#voting-preview'>
      <CardContent>
        <Box mb={2}>
          <InputLabel shrink>Voting key</InputLabel>
          <CreatableSelect
            menuPortalTarget={document.body}
            value={{ value: votingKey, label: votingKey }}
            options={votingKeys.map((key) => ({ value: key, label: key }))}
            onChange={(newValue) => setVotingKey(newValue?.value ?? '')}
          />
        </Box>
        {votingKey && (
          <>
            <Typography>
              Voting finished: {formatBoolean(voting.ended)}
            </Typography>
            <Typography>
              Voting started: {formatBoolean(voting.started)}
            </Typography>
            <Typography gutterBottom>
              Winning match: {voting.winningMatch || '-'}
            </Typography>
            <ListSubheader>
              <Typography>Worker votes</Typography>
            </ListSubheader>
            <List>
              {workers.map((worker, index) => (
                <ListItem key={worker}>
                  <Typography>
                    Worker {index}:{' '}
                    <Typography variant='caption'>
                      {voting.workersToVote?.[worker] ?? '-'}
                    </Typography>
                  </Typography>
                </ListItem>
              ))}
            </List>
          </>
        )}
      </CardContent>
      <CardActions>
        {votingKey && (
          <>
            <Box
              width={'100%'}
              component='form'
              onSubmit={async (e: FormEvent<HTMLDivElement>) => {
                e.preventDefault();
                await vote(matchResult);
                setMatchResult('');
              }}
            >
              <Box mb={1}>
                <TextField
                  size='small'
                  fullWidth
                  label='Match result'
                  onChange={(event) => setMatchResult(event.target.value)}
                />
              </Box>
              <Button
                type='submit'
                fullWidth
                variant='contained'
                color='secondary'
              >
                Vote for match
              </Button>
            </Box>
          </>
        )}
      </CardActions>
    </Card>
  );
};

export default VotingPreview;
