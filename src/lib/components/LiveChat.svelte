<script>
    import { onMount, onDestroy } from 'svelte';
    import { PusherService } from '$lib/services/PusherService.js';
    import { toastService } from '$lib/services/ToastService.js';
    
    let messages = $state([]);
    let newMessage = $state("");
    let userName = $state("Viewer" + Math.floor(Math.random() * 1000));
    let connected = $state(false);
    let status = $state("Disconnected");
    
    let chatContainer;
    let pusherService;
    
    onMount(async () => {
        // Initialize Pusher service
        pusherService = new PusherService();
        
        // Set up callbacks
        pusherService.setCallbacks({
            onMessage: handleNewMessage,
            onProductMessage: handleProductMessage,
            onConnected: handleConnected,
            onDisconnected: handleDisconnected,
            onError: handleError
        });
        
        // Use standard private channel name for all live chat
        const channelName = "private-live-chat";
        const success = await pusherService.init(channelName);
        if (!success) {
            toastService.error("Failed to initialize chat");
        }
    });
    
    onDestroy(() => {
        if (pusherService) {
            pusherService.destroy();
        }
    });
    
    function handleNewMessage(message) {
        messages = [...messages, message];
        scrollChatToBottom();
    }
    
    function handleProductMessage(productMessage) {
        messages = [...messages, productMessage];
        scrollChatToBottom();
    }
    
    function handleConnected() {
        connected = true;
        status = "Connected";
        toastService.success("Chat connected successfully!");
    }
    
    function handleDisconnected() {
        connected = false;
        status = "Disconnected";
        toastService.info("Chat disconnected");
    }
    
    function handleError(error) {
        connected = false;
        status = "Failed";
        toastService.error(error);
    }
    
    async function sendMessage() {
        if (!newMessage.trim() || !connected || !pusherService) return;
        
        try {
            // Create the message object
            const messageData = {
                id: Date.now().toString(),
                user: userName,
                message: newMessage.trim(),
                timestamp: new Date().toISOString()
            };
            
            // Add message to our own chat immediately
            const message = {
                id: messageData.id,
                user: messageData.user,
                message: messageData.message,
                timestamp: new Date(messageData.timestamp),
            };
            handleNewMessage(message);
            
            // Send to other clients via Pusher
            await pusherService.sendMessage(userName, newMessage.trim());
            newMessage = "";
        } catch (error) {
            toastService.error("Failed to send message");
        }
    }
    
    function handleKeydown(event) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    }
    
    function scrollChatToBottom() {
        setTimeout(() => {
            if (chatContainer) {
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }
        }, 100);
    }
</script>

<div class="chat-display">
    <div class="chat-header">
        <h3>Live Chat</h3>
        <div class="chat-info">
            <span class="user-info">Logged in as: {userName}</span>
            {#if connected}
                <span class="online-badge">
                    <span class="online-dot"></span>
                    ONLINE
                </span>
            {/if}
        </div>
        <div class="debug-info">
            <small>Channel: {pusherService?.getState()?.chatChannel || 'Not connected'}</small>
            <small>Status: {status}</small>
        </div>
    </div>

    <div class="chat-messages" bind:this={chatContainer}>
        {#if messages.length === 0}
            <div class="no-messages">
                <div class="chat-icon">💬</div>
                <p>No messages yet</p>
                <p class="hint">Be the first to say hello!</p>
            </div>
        {:else}
            {#each messages as message (message.id)}
                {#if message.isProductMessage}
                    <div class="message product-message">
                        <div class="product-message-header">
                            <span class="product-icon">🛍️</span>
                            <span class="message-user">{message.user}</span>
                            <span class="message-time">
                                {message.timestamp.toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </span>
                        </div>
                        <div class="product-message-content">
                            <div class="product-info">
                                {#if message.product.image}
                                    <div class="product-image-chat">
                                        <img src={message.product.image} alt={message.product.name} />
                                    </div>
                                {/if}
                                <div class="product-details-chat">
                                    <div class="product-name-chat">{message.product.name}</div>
                                    <div class="product-price-chat">${message.product.price}</div>
                                </div>
                            </div>
                            <div class="product-message-text">
                                {message.message}
                            </div>
                        </div>
                    </div>
                {:else}
                    <div class="message">
                        <div class="message-header">
                            <span class="message-user">{message.user}</span>
                            <span class="message-time">
                                {message.timestamp.toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </span>
                        </div>
                        <div class="message-content">
                            {message.message}
                        </div>
                    </div>
                {/if}
            {/each}
        {/if}
    </div>

    <div class="chat-input-section">
        <div class="chat-user-settings">
            <input
                type="text"
                bind:value={userName}
                placeholder="Your name"
                class="user-input"
                maxlength="20"
            />
        </div>
        <div class="chat-input-container">
            <input
                type="text"
                bind:value={newMessage}
                placeholder="Type a message..."
                class="chat-input"
                disabled={!connected}
                onkeydown={handleKeydown}
                maxlength="500"
            />
            <button
                class="send-button"
                onclick={sendMessage}
                disabled={!connected || !newMessage.trim()}
            >
                Send
            </button>
        </div>
    </div>
</div>

<style>
    .chat-display {
        background: white;
        border: 1px solid #e1e1e1;
        border-radius: 12px;
        padding: 0;
        display: flex;
        flex-direction: column;
        height: 400px;
        flex: 1;
    }

    .chat-header {
        padding: 1rem 1.5rem;
        border-bottom: 1px solid #f0f0f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
    }

    .chat-header h3 {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: #202223;
    }

    .chat-info {
        display: flex;
        align-items: center;
        gap: 1rem;
        font-size: 0.875rem;
    }

    .user-info {
        color: #6d7175;
    }

    .debug-info {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        font-size: 0.75rem;
        color: #9ca3af;
        margin-top: 0.5rem;
    }

    .online-badge {
        background: #00a96e;
        color: white;
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 0.25rem;
    }

    .online-dot {
        width: 6px;
        height: 6px;
        background: white;
        border-radius: 50%;
        animation: pulse 2s infinite;
    }

    .chat-messages {
        flex: 1;
        padding: 1rem 1.5rem;
        overflow-y: auto;
        background: #fafbfb;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .no-messages {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        text-align: center;
        color: #6d7175;
    }

    .chat-icon {
        font-size: 2rem;
        margin-bottom: 0.5rem;
        opacity: 0.6;
    }

    .no-messages p {
        margin: 0.25rem 0;
        font-size: 0.875rem;
    }

    .hint {
        font-size: 0.75rem;
        opacity: 0.8;
    }

    .message {
        background: white;
        border: 1px solid #e1e1e1;
        border-radius: 8px;
        padding: 0.75rem 1rem;
        max-width: 85%;
        align-self: flex-start;
    }

    .message-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.25rem;
    }

    .message-user {
        font-weight: 600;
        font-size: 0.875rem;
        color: #202223;
    }

    .message-time {
        font-size: 0.75rem;
        color: #6d7175;
    }

    .message-content {
        font-size: 0.875rem;
        color: #202223;
        line-height: 1.4;
        word-wrap: break-word;
    }

    /* Product Message Styles */
    .product-message {
        background: linear-gradient(135deg, #fef3c7 0%, #f59e0b 100%);
        border: 2px solid #f59e0b;
        box-shadow: 0 4px 8px rgba(245, 158, 11, 0.2);
        position: relative;
        overflow: hidden;
    }

    .product-message::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, #f59e0b, #eab308, #f59e0b);
        animation: shimmer 2s ease-in-out infinite;
    }

    .product-message-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
    }

    .product-icon {
        font-size: 1rem;
    }

    .product-message-content {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .product-info {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        background: rgba(255, 255, 255, 0.9);
        border-radius: 8px;
        padding: 0.75rem;
    }

    .product-image-chat {
        width: 50px;
        height: 50px;
        border-radius: 6px;
        overflow: hidden;
        background: #f6f6f7;
        flex-shrink: 0;
    }

    .product-image-chat img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .product-details-chat {
        flex: 1;
    }

    .product-name-chat {
        font-weight: 600;
        font-size: 0.875rem;
        color: #202223;
        margin-bottom: 0.25rem;
        line-height: 1.3;
    }

    .product-price-chat {
        font-size: 1rem;
        font-weight: 700;
        color: #f59e0b;
    }

    .product-message-text {
        font-size: 0.875rem;
        color: #92400e;
        font-weight: 500;
        background: rgba(255, 255, 255, 0.7);
        padding: 0.5rem 0.75rem;
        border-radius: 6px;
    }

    .chat-input-section {
        padding: 1rem 1.5rem;
        border-top: 1px solid #f0f0f0;
        background: white;
        flex-shrink: 0;
    }

    .chat-user-settings {
        margin-bottom: 0.75rem;
    }

    .user-input {
        width: 100%;
        padding: 0.5rem 0.75rem;
        border: 1px solid #c9cccf;
        border-radius: 6px;
        font-size: 0.875rem;
        background: #f9fafb;
    }

    .user-input:focus {
        outline: none;
        border-color: #005bd3;
        box-shadow: 0 0 0 2px rgba(0, 91, 211, 0.1);
        background: white;
    }

    .chat-input-container {
        display: flex;
        gap: 0.75rem;
        align-items: center;
    }

    .chat-input {
        flex: 1;
        padding: 0.75rem;
        border: 1px solid #c9cccf;
        border-radius: 8px;
        font-size: 0.875rem;
        background: white;
        resize: none;
    }

    .chat-input:focus {
        outline: none;
        border-color: #005bd3;
        box-shadow: 0 0 0 2px rgba(0, 91, 211, 0.1);
    }

    .chat-input:disabled {
        background: #f6f6f7;
        color: #6d7175;
        cursor: not-allowed;
    }

    .send-button {
        background: #005bd3;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 0.75rem 1.25rem;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
        white-space: nowrap;
    }

    .send-button:hover:not(:disabled) {
        background: #004bb5;
    }

    .send-button:disabled {
        background: #c9cccf;
        cursor: not-allowed;
    }

    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
    }

    @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
    }

    @media (max-width: 768px) {
        .chat-input-container {
            flex-direction: column;
            gap: 0.5rem;
            align-items: stretch;
        }

        .send-button {
            width: 100%;
        }
    }
</style>