import type { MatchingResultReceiver } from './types';
import axios from 'axios';

export const matchingResultDDHubSender: MatchingResultReceiver = async (result) => {
  await axios.request({
    method: 'post',
    baseURL: process.env.DDHUB_URL,
    url: 'file',
    data: {
      file: result,
      fileName: result.tree.rootHash,
    },
  });
};
