<script>
    let { healthData = null, show = true } = $props();
    
    function getStatusClass(status) {
        if (!status || status === 'Error') return 'error';
        if (status === 'OK') return 'success';
        return 'warning';
    }
    
    function getDbStatusClass(dbStatus) {
        if (!dbStatus || dbStatus === 'error') return 'error';
        if (dbStatus === 'connected') return 'success';
        return 'warning';
    }
</script>

{#if show && healthData}
    <div class="system-status">
        <div class="status-indicator">
            <div class="status-display">
                <span class="status-dot status-dot-{getStatusClass(healthData.message)}"></span>
                <span>System Status: {healthData.message}</span>
            </div>
            <span class="status-detail">
                Database: 
                <span class="db-status db-status-{getDbStatusClass(healthData.db_status)}">
                    {healthData.db_status}
                </span>
            </span>
        </div>
    </div>
{/if}

<style>
    .system-status {
        position: fixed;
        bottom: var(--space-4);
        right: var(--space-4);
        background: var(--color-surface);
        padding: var(--space-3) var(--space-4);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-sm);
        border: 1px solid var(--color-border);
        z-index: 10;
    }

    .status-indicator {
        display: flex;
        align-items: center;
        font-size: var(--font-size-xs);
        color: var(--color-text-muted);
        flex-direction: column;
        gap: var(--space-2);
    }

    .status-display {
        display: flex;
        align-items: center;
        gap: var(--space-2);
    }

    .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        display: inline-block;
    }

    .status-dot-success {
        background: var(--color-success);
    }

    .status-dot-error {
        background: var(--color-error);
    }

    .status-dot-warning {
        background: var(--color-warning);
    }

    .status-detail {
        color: var(--color-text-light);
        font-size: var(--font-size-xs);
    }

    .db-status-success {
        color: var(--color-success-text);
    }

    .db-status-error {
        color: var(--color-error-text);
    }

    .db-status-warning {
        color: var(--color-warning-text);
    }

    @media (max-width: 768px) {
        .system-status {
            bottom: var(--space-2);
            right: var(--space-2);
            padding: var(--space-2) var(--space-3);
        }
    }
</style>