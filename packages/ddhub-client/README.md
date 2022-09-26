# Green Proofs DDHUB Client
### Installation

[//]: # (TODO: Change after deployment)
```yarn add @energyweb/greenproof-ddhub-client```

### Example

```ts
const client = new DDHubClient({
    config: [
      {
        channelName: 'receive_input',
        channelType: 'sub',
        conditions: { roles: ['provider.roles.247.apps.energyweb.iam.ewc'], dids: [] },
        encrypted: true,
        topicName: 'data_provider',
        topicVersion: '1.0.0',
      },
      {
        channelName: 'send_results',
        channelType: 'upload',
        conditions: { roles: ['cache.roles.247.apps.energyweb.iam.ewc'], dids: [] },
        encrypted: true,
        topicName: 'result_provider',
        topicVersion: '1.0.0',
      },
    ],
    ownerNamespace: '247.apps.energyweb.iam.ewc',
    privateKey: 'fd055324f73...2ea45bc8114839e0703e185d',
    ddhubUrl: 'https://client-gateway.energyweb.org/api/v2/',
  });

  await client.setup();

  const [message] = await client.getMessages({
    fqcn: 'receive_input',
    amount: 1
  })

  const result = await someLogic(message);

  await client.sendMessage({
    fqcn: 'send_results',
    payload: JSON.stringify(result),
    transactionId: '1'
  })
```
