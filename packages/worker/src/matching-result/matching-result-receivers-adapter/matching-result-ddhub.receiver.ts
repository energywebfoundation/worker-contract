import type { MatchingResultReceiver } from './types';
import axios from 'axios';

enum Topic {
  Results = 'results'
}

export const matchingResultDDHubSender: MatchingResultReceiver = async (result) => {
  await axios.request({
    method: 'post',
    baseURL: process.env.DDHUB_URL,
    url: 'message',
    data: {
      message: result,
      topicName: Topic.Results,
    },
  });
};
