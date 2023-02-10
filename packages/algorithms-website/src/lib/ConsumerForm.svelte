<script lang="ts">
import type { EntityConsumption } from '../types';

export let onChange: (internalId: number, consumer: EntityConsumption) => void;
export let internalId: number;

let id = 'c1';
let volume = '0';
let siteId = 'site1';
let regionId = 'region1';
let energyPriorities = 'pv:2,wind:1';
let shouldMatchByRegion = false;

$ : {
  onChange(internalId, {
    id,
    volume: Number.isFinite(parseInt(volume)) ? Number(volume) : 0,
    siteId,
    regionId,
    energyPriorities: energyPriorities ? energyPriorities.split(',').map(p => {
      const [energyType, priority] = p.split(':');

      return {
        energyType,
        priority: Number.isFinite(parseInt(priority)) ? Number(priority) : 0,
      }
    }) : [],
    shouldMatchByRegion
  })
}
</script>

<div>
  <label>
    <span>Consumer ID</span>
    <input type="text" bind:value={id}>
  </label>
  <label>
    <span>Consumption</span>
    <input type="text" bind:value={volume}>
  </label>
  <label>
    <span>Site ID</span>
    <input type="text" bind:value={siteId}>
  </label>
  <label>
    <span>Region ID</span>
    <input type="text" bind:value={regionId}>
  </label>
  <label class="is-wide">
    <span>Energy priorities</span>
    <input type="text" bind:value={energyPriorities}>
  </label>
  <label>
    <span>Should match by region</span>
    <input type="checkbox" bind:checked={shouldMatchByRegion}>
  </label>
</div>

<style>
  div {
    display: flex;
  }

  label {
    display: flex;
    flex-direction: column;
    width: 120px;
    margin-right: 16px;
  }

  label.is-wide {
    width: 240px;
  }

  label span {
    font-size: 10px;
    margin-bottom: 6px;
  }
</style>