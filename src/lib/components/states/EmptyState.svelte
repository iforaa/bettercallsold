<script lang="ts">
  interface ActionButton {
    label: string;
    onClick: () => void;
    primary?: boolean;
  }

  interface Props {
    icon?: string;
    title: string;
    description: string;
    actions?: ActionButton[];
  }
  
  let { 
    icon = '📋', 
    title, 
    description, 
    actions = [] 
  }: Props = $props();
</script>

<div class="empty-state">
  <div class="empty-icon">{icon}</div>
  <h3 class="empty-title">{title}</h3>
  <p class="empty-description">{description}</p>
  {#if actions.length > 0}
    <div class="empty-actions">
      {#each actions as action}
        <button 
          class="btn {action.primary ? 'btn-primary' : 'btn-secondary'}" 
          onclick={action.onClick}
        >
          {action.label}
        </button>
      {/each}
    </div>
  {/if}
</div>