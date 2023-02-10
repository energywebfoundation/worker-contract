<script lang="ts">
  import type { EntityGeneration } from '../types';
  export let onChange: (internalId: number, generation: EntityGeneration) => void;
  export let internalId: number;
  
  let id = 'g1';
  let volume = '0';
  let siteId = 'site1';
  let regionId = 'region1';
  let energyType = 'pv';
  
  $ : {
    onChange(internalId, {
      id,
      volume: Number.isFinite(parseInt(volume)) ? Number(volume) : 0,
      siteId,
      regionId,
      energyType
    });
  }
</script>
  
  <div>
    <label>
      <span>Generator ID</span>
      <input type="text" bind:value={id}>
    </label>
    <label>
      <span>Generation vol</span>
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
    <label>
      <span>Energy type</span>
      <input type="text" bind:value={energyType}>
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
  
    label span {
      font-size: 10px;
      margin-bottom: 6px;
    }
  </style>