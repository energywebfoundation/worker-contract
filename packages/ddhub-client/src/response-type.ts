import type { AxiosRequestConfig } from 'axios';
import axios from 'axios';

export const getWithResponseType = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> => {
  const source = axios.CancelToken.source();
  const promise = axios({
    ...config,
    ...options,
    cancelToken: source.token,
  }).then(({ data }) => data as T);

  // @ts-ignore
  promise.cancel = () => {
    source.cancel('Query was cancelled by React Query');
  };

  return promise;
};

export default getWithResponseType;
