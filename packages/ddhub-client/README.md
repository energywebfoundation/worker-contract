# Green Proof DDHub client

Used to communicate with Energyweb DDHUB messaging server

## Installation

```yarn add @energyweb/greenproof-ddhub-client```

## Example

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

## Questions and Support

For questions and support please use Energy Web's [Discord channel](https://discord.com/channels/706103009205288990/843970822254362664)

Or reach out to us via email: 247enquiries@energyweb.org

## EW-DOS

The Energy Web Decentralized Operating System is a blockchain-based, multi-layer digital infrastructure.

The purpose of EW-DOS is to develop and deploy an open and decentralized digital operating system for the energy sector in support of a low-carbon, customer-centric energy future.

We develop blockchain technology, full-stack applications and middleware packages that facilitate participation of Distributed Energy Resources on the grid and create open market places for transparent and efficient renewable energy trading.

-   To learn about more about the EW-DOS tech stack, see our [documentation](https://app.gitbook.com/@energy-web-foundation/s/energy-web/).

-   For an overview of the energy-sector challenges our use cases address, go [here](https://app.gitbook.com/@energy-web-foundation/s/energy-web/our-mission).

For a deep-dive into the motivation and methodology behind our technical solutions, we encourage you to read our White Papers:

-   [Energy Web White Paper on Vision and Purpose](https://www.energyweb.org/reports/EWDOS-Vision-Purpose/)
-   [Energy Web White Paper on Technology Detail](https://www.energyweb.org/wp-content/uploads/2020/06/EnergyWeb-EWDOS-PART2-TechnologyDetail-202006-vFinal.pdf)

## Connect with Energy Web

-   [Twitter](https://twitter.com/energywebx)
-   [Discord](https://discord.com/channels/706103009205288990/843970822254362664)
-   [Telegram](https://t.me/energyweb)