<script lang="ts">
import { matchIntoTable } from './algo';

import ConsumerForm from './lib/ConsumerForm.svelte'
import GeneratorForm from './lib/GeneratorForm.svelte';
import MatchTable from './lib/MatchTable.svelte';
import type { EntityConsumption, EntityGeneration } from './types';

let consumers: EntityConsumption[] = [];
let generators: EntityGeneration[] = [];
let matchResultsTable: { strategy: string, data: string[][] }[] = [];

function onConsumerAdd () {
  consumers = consumers.concat({
    id: 'c1',
    regionId: 'r1',
    shouldMatchByRegion: false,
    siteId: 's1',
    volume: 0,
    energyPriorities: []
  })
}

function onGeneratorAdd () {
  generators = generators.concat({
    id: 'g1',
    regionId: 'r1',
    siteId: 's1',
    volume: 0,
    energyType: 'pv',
  })
}

function onGeneratorUpdate (internalId: number, generator: EntityGeneration) {
  generators[internalId] = generator;
}

function onConsumerUpdate (internalId: number, consumer: EntityConsumption) {
  consumers[internalId] = consumer;
}

function onConsumerRemove () {
  consumers = consumers.slice(0, -1)
}

function onGeneratorRemove () {
  generators = generators.slice(0, -1)
}

function onMatch () {
  matchResultsTable = matchIntoTable({
    consumptions: consumers as any,
    generations: generators as any,
  });
}
</script>

<main>
  <div class="input-container">
    <div class="input-container_header">
      Consumers
    </div>
    {#each consumers as _, i}
      <ConsumerForm onChange={onConsumerUpdate} internalId={i} />
    {:else}
      No consumers
    {/each}
  </div>

  <div class="input-container">
    <div class="input-container_header">
      Generators
    </div>
    {#each generators as _, i}
      <GeneratorForm onChange={onGeneratorUpdate} internalId={i} />
    {:else}
        No generators
    {/each}
  </div>

  <div class="controls">
    <button on:click={onConsumerAdd}>Add consumer</button>
    <button on:click={onGeneratorAdd}>Add generator</button>
    <button on:click={onConsumerRemove}>Remove consumer</button>
    <button on:click={onGeneratorRemove}>Remove generator</button>
    <button on:click={onMatch}>Match</button>
  </div>
  
  {#each matchResultsTable as matchTable}
    <MatchTable header={matchTable.strategy} data={matchTable.data} />
  {/each}
</main>

<style>
  :root {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }

  main {
    padding: 1em;
    margin: 0 auto;
  }

  .input-container {
    margin-bottom: 20px;
    display: grid;
    row-gap: 12px;
  }

  .input-container_header {
    font-size: 26px;
  }

  .controls {
    text-align: center;
    margin-bottom: 20px;
  }
</style>
