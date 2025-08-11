<script lang="ts">
  interface Props {
    error: string;
    title?: string;
    onRetry?: () => void;
    onBack?: () => void;
    retryLabel?: string;
    backLabel?: string;
  }
  
  let { 
    error, 
    title = 'Error', 
    onRetry, 
    onBack,
    retryLabel = 'Try Again',
    backLabel = 'Go Back'
  }: Props = $props();
</script>

<div class="error-state">
  <div class="error-icon">⚠️</div>
  <h3 class="error-title">{title}</h3>
  <p class="error-description">{error}</p>
  <div class="error-actions">
    {#if onRetry}
      <button class="btn btn-secondary" onclick={onRetry}>{retryLabel}</button>
    {/if}
    {#if onBack}
      <button class="btn btn-primary" onclick={onBack}>{backLabel}</button>
    {/if}
  </div>
</div>