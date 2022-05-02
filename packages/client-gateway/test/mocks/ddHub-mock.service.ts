import type { IncomingMessage, ServerResponse } from 'http';
import * as http from 'http';

export const MOCK_API_PORT = 3000;

const createDDHub = () =>
  http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
    res.writeHead(200);
    res.end();
  });

let server: http.Server;

export const startMockDDHub = () => {
  server = createDDHub();
  server.listen(MOCK_API_PORT);
};

export const stopMockDDHub = () => {
  server.close();
};
