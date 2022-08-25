import { DDHubClient } from "../dist";
import { Config } from "../src";

export const workerChannelConfig: Config[] = [
  {
    channelName: 'worker.receive.input',
    channelType: 'sub',
    conditions: { roles: ['provider.roles.247.apps.qb.iam.ewc'], dids: [] },
    encrypted: true,
    topicName: 'data_provider',
    topicVersion: '1.0.0',
  },
  {
    channelName: 'worker.send.result',
    channelType: 'pub',
    conditions: { roles: ['cache.roles.247.apps.qb.iam.ewc'], dids: [] },
    encrypted: true,
    topicName: 'data_provider',
    topicVersion: '1.0.0',
  },
  {
    channelName: 'worker.receive.battery',
    channelType: 'sub',
    conditions: { roles: ['worker.roles.247.apps.qb.iam.ewc'], dids: [] },
    encrypted: true,
    topicName: 'battery_store',
    topicVersion: '1.0.0',
  },
  {
    channelName: 'worker.send.battery',
    channelType: 'pub',
    conditions: { roles: ['worker.roles.247.apps.qb.iam.ewc'], dids: [] },
    encrypted: true,
    topicName: 'battery_store',
    topicVersion: '1.0.0',
  },
]

export function bootstrap() {
  const worker = new DDHubClient({
    config: workerChannelConfig,
    ownerNamespace: '247.apps.qb.iam.ewc',
    privateKey:
      'fd055324f73fb2cf5657f3160cd502ea40523029f3845bc8114839e0703e185d',
    ddhubUrl: 'https://qb-ddhub-client-gateway-dev-0.energyweb.org',
    debugModeOn: true,
  });

  const worker_1 = new DDHubClient({
    config: workerChannelConfig,
    ownerNamespace: '247.apps.qb.iam.ewc',
    privateKey:
      'cf4a7c38fae38420c1690c6d5fa13d2f90afdeed608535bbc623aa60bbd9b3be',
    ddhubUrl: 'https://qb-ddhub-client-gateway-dev-1.energyweb.org',
    debugModeOn: true,
  });

  const worker_2 = new DDHubClient({
    config: workerChannelConfig,
    ownerNamespace: '247.apps.qb.iam.ewc',
    privateKey:
      '0d46b75f3a5f6b24cd3541dca9dde84442d411e1b10392f0fce0bcb93a9bd2ee',
    ddhubUrl: 'https://qb-ddhub-client-gateway-dev-2.energyweb.org',
    debugModeOn: true,
  });

  const backend = new DDHubClient({
    config: [
      {
        channelName: 'cache.receive.result',
        channelType: 'sub',
        conditions: { roles: ['worker.roles.247.apps.qb.iam.ewc'], dids: [] },
        encrypted: true,
        topicName: 'result_provider',
        topicVersion: '1.0.0',
      },
    ],
    ownerNamespace: '247.apps.qb.iam.ewc',
    privateKey:
      '887763c26a928f309816d66a3c35c90fd147823903e69f06b6a237a0b07283ca',
    ddhubUrl: 'https://qb-ddhub-client-gateway-dev-3.energyweb.org',
    debugModeOn: true,
  });

  const provider = new DDHubClient({
    config: [
      {
        channelName: 'provider.send.input',
        channelType: 'pub',
        conditions: { roles: ['worker.roles.247.apps.qb.iam.ewc'], dids: [] },
        encrypted: true,
        topicName: 'data_provider',
        topicVersion: '1.0.0',
      },
    ],
    ownerNamespace: '247.apps.qb.iam.ewc',
    privateKey:
      'b6fccfecacd5411feb731d3b23a164f936bafc4bd1af6a3ad00e098620a75030',
    ddhubUrl: 'https://qb-ddhub-client-gateway-dev-4.energyweb.org',
    debugModeOn: true,
  });
  return {
    worker, worker_1, worker_2, provider, backend
  }
}
