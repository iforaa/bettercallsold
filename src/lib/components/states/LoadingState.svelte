<script lang="ts">
  interface Props {
    message?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    inline?: boolean;
  }
  
  let { message = 'Loading...', size = 'md', inline = false }: Props = $props();
</script>

<div class="loading-state" class:loading-state-inline={inline}>
  <div class="spinner spinner-{size}"></div>
  {#if message}<h3 class="loading-text-lg">{message}</h3>{/if}
</div>