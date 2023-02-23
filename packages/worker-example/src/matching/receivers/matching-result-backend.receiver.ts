import type { MatchingResultReceiver } from '../types';
import axios from 'axios';
import type { MatchingResult } from 'types';
import { appConfig } from '../../config/app-config';

export const matchingResultBackendSender: MatchingResultReceiver = async (result) => {
  await sendToBackend(result.result);

  console.log('Sending result to backend');
};

const sendToBackend = async (result: MatchingResult) => {
  await axios.request({
    method: 'post',
    baseURL: appConfig.backend.url,
    url: appConfig.backend.matchingResultEndpoint,
    data: result,
    headers: { 'api-key': appConfig.backend.apiKey },
  });
};
