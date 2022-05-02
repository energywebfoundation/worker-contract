import React, { FormEvent } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  List,
  ListItem,
  ListSubheader,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useWorkerPreview } from './WorkersPreview.effects';

const WorkersPreview = ({}) => {
  const {
    workers,
    addWorker,
    deleteWorker,
    setWorkerAddress,
    workerAddress,
    numberOfWorkers,
  } = useWorkerPreview();

  return (
    <Card>
      <CardContent>
        <Box
          mb={2}
          component='form'
          onSubmit={async (e: FormEvent<HTMLDivElement>) => {
            e.preventDefault();
            await addWorker(workerAddress);
            setWorkerAddress('');
          }}
        >
          <TextField
            size='small'
            fullWidth
            label='Worker address'
            onChange={(event) => setWorkerAddress(event.target.value)}
            sx={{ mb: 1 }}
          />
          <Button type='submit' variant='contained' color='secondary' fullWidth>
            Add worker
          </Button>
        </Box>

        <ListSubheader>
          <Typography>Number of workers: {numberOfWorkers}</Typography>
        </ListSubheader>
        <List>
          {workers.map((worker, index) => (
            <ListItem
              key={worker}
              secondaryAction={
                <IconButton edge='end' onClick={() => deleteWorker(worker)} >
                  <DeleteIcon />
                </IconButton>
              }
            >
              <Typography>
                Worker {index + 1}:{' '}
                <Typography variant='caption'>{worker}</Typography>
              </Typography>
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
};

export default WorkersPreview;
