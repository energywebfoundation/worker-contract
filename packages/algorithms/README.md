# Green proof algorithms

Collection of algorithms used for performing matching between energy consumers and energy generators.

Any input should match algorithm interface, therefore handling special cases like battery charging/discharging should be handled
before and after using the algorithm. One example workaround is to create special kind of `id` (for consumers/generators) that will contain
some additional metadata, that for example the entity is a battery.

## Proportional Matcher

We expect consumptions and generations assetIds to be unique, that is have one read per device.

Each consumption has it's matching preferences.

Matches happen in rounds (more on that later). In each round not fulfilled consumption, and not used up generation is fed into next round.
Therefore rounds determine matching priority. Whatever is matched in the same round in matched proportionally to consumption and available generation.

What gets matched with what in given matching round is determined by *paths* (that come from *path strategies*).
Path strategy essentially describes matching round, therefore it implies priority. For example if `sitePathStrategy` is first in list of strategies, then consumers/generators in the same site will be matched first.
There are various way to connect consumers with generators (by energy priority preference, regional preference and so on).
As the path strategies are written in declarative way (and documented), I'll skip description of them. Please consult the code for details.

Matched volumes in given round are determined in this way:
1. Consumers are assigned generators (according to paths)
2. Each consumer makes asks to its generators (one ask per generator). The more volume the generator has, the greater the ask will be created.
The sum of all asks for given consumer adds up to this consumer required volume.
3. Each generator now checks his asks, and assigns its volume to each ask creating a match. The greater the ask, the more volume will be assigned to the ask. The sum of all matches adds up to this generator available volume.

Because asks are created first, and then they are narrowed to matches by generator it may happen, that an ask may not be resolved completely.
In such case consumer will be named "leftoverConsumption", and passed to a next round of matching.
If sum of all asks is lower than the generator available volume, then such generator will be named "leftoverGenerator", and passed to a next round of matching.

Leftovers from the last round of matching are considered leftovers from the whole matching process.

**We don't use** fraction of volumes. Therefore if assigning proportionally isn't possible without fractions, then the volume is assigned proportionally as much as possible, and then the volume that would become fraction is assigned to all entities by 1 (Wh) until the volume (whether the ask or generator's volume) is depleted.

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



