<script lang="ts">
export let header: string;
export let data: string[][];
</script>

<div class="container">
  <div class="header">{header}</div>
  <table>
    {#each data as row}
      <tr>
        {#each row as column}
          <td>{@html column}</td>
        {/each}
      </tr>
    {/each}
  </table>
</div>

<style>
  .container {
    text-align: left;
    margin-bottom: 20px;
    border-bottom: 1px solid #999;
    padding-bottom: 20px;
  }

  .header {
    margin-bottom: 10px;
  }

  table {
    border-collapse: collapse;
  }

  td {
    border: 1px solid #999;
    padding: 0.5em;
  }
</style>