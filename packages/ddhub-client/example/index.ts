import { DDHubClient } from '../dist';

(async () => {
  const client = new DDHubClient({
    config: [
      {
        channelName: 'receive_input',
        channelType: 'sub',
        conditions: { roles: ['provider.roles.247.apps.qb.iam.ewc'], dids: [] },
        encrypted: true,
        topicName: 'data_provider',
        topicVersion: '1.0.0',
      },
      {
        channelName: 'send_results',
        channelType: 'upload',
        conditions: { roles: ['cache.roles.247.apps.qb.iam.ewc'], dids: [] },
        encrypted: true,
        topicName: 'result_provider',
        topicVersion: '1.0.0',
      },
      {
        channelName: 'receive_battery_state',
        channelType: 'sub',
        conditions: { roles: ['worker.roles.247.apps.qb.iam.ewc'], dids: [] },
        encrypted: true,
        topicName: 'battery_store',
        topicVersion: '1.0.0',
      },
      {
        channelName: 'send_battery_state',
        channelType: 'pub',
        conditions: { roles: ['worker.roles.247.apps.qb.iam.ewc'], dids: [] },
        encrypted: true,
        topicName: 'battery_store',
        topicVersion: '1.0.0',
      },
    ],
    ownerNamespace: '247.apps.qb.iam.ewc',
    privateKey: 'fd055324f73fb2cf5657f3160cd502ea40523029f3845bc8114839e0703e185d',
    ddhubUrl: 'https://qb-ddhub-client-gateway-dev-0.energyweb.org/api/v2/',
  });

  await client.setup();
})();
