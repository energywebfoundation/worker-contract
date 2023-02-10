# Green Proof overseer

Nest.js module used to overseer voting contract.
It is used mostly as a way to handle missed voting contract events, when the application was down.
If any events were missed while application was down, then they will be remitted.
For that persistent storage of some kind is required (provided through handlers in module `.register` method).
It can be also be used to periodically trigger timeouted votings cancellation.

## Usage

1. Install: `@energyweb/greenproof-overseer`
2. Import `OverseerModule.register({ ...config })` to your application
3. Inject `OverseerFacade`

### Handling missed events

See [example-handlers](./src/example-handlers.ts) on how to implement event handler in the application.
Such handler should be injected somewhere in the application.

Consult [Nest.js docs](https://docs.nestjs.com/techniques/events) for more information about working with used `@nestjs/event-emitter` package.

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