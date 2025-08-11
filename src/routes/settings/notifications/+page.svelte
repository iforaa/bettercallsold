<script lang="ts">
	// Notification settings state
	let emailNotifications = $state([
		{
			id: 'order_confirmation',
			title: 'Order confirmation',
			description: 'Sent to customers after they place an order',
			enabled: true,
			category: 'customer'
		},
		{
			id: 'order_cancelled',
			title: 'Order cancelled',
			description: 'Sent to customers when their order is cancelled',
			enabled: true,
			category: 'customer'
		},
		{
			id: 'order_fulfilled',
			title: 'Order fulfilled',
			description: 'Sent to customers when their order ships',
			enabled: true,
			category: 'customer'
		},
		{
			id: 'order_refunded',
			title: 'Order refunded',
			description: 'Sent to customers when their order is refunded',
			enabled: true,
			category: 'customer'
		},
		{
			id: 'new_order_admin',
			title: 'New order notification',
			description: 'Sent to store administrators when a new order is placed',
			enabled: true,
			category: 'admin'
		},
		{
			id: 'payment_received',
			title: 'Payment received',
			description: 'Sent to store administrators when payment is received',
			enabled: false,
			category: 'admin'
		}
	]);

	let smsNotifications = $state([
		{
			id: 'order_status_sms',
			title: 'Order status updates',
			description: 'Send SMS updates for order status changes',
			enabled: false,
			category: 'customer'
		},
		{
			id: 'shipping_updates_sms',
			title: 'Shipping updates',
			description: 'Send SMS notifications when orders ship',
			enabled: false,
			category: 'customer'
		}
	]);

	let webhookSettings = $state({
		orderCreated: '',
		orderUpdated: '',
		orderPaid: '',
		orderFulfilled: '',
		orderCancelled: ''
	});

	let generalSettings = $state({
		senderName: 'BetterCallSold',
		senderEmail: 'orders@bettercallsold.com',
		replyToEmail: 'support@bettercallsold.com',
		enableSms: false,
		twilioAccountSid: '',
		twilioAuthToken: '',
		twilioPhoneNumber: ''
	});

	function toggleNotification(notifications: any[], id: string) {
		const notification = notifications.find(n => n.id === id);
		if (notification) {
			notification.enabled = !notification.enabled;
		}
	}

	function getCustomerNotifications() {
		return emailNotifications.filter(n => n.category === 'customer');
	}

	function getAdminNotifications() {
		return emailNotifications.filter(n => n.category === 'admin');
	}

	function previewEmail(notification: any) {
		console.log('Preview email for:', notification.id);
	}

	function testWebhook(event: string) {
		console.log('Testing webhook for:', event);
	}
</script>

<svelte:head>
	<title>Notifications - BetterCallSold Settings</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<div class="header-content">
			<h1>
				<span class="page-icon">🔔</span>
				Notifications
			</h1>
		</div>
		<div class="breadcrumb">
			<span>Settings</span>
			<span class="breadcrumb-separator">›</span>
			<span>Notifications</span>
		</div>
	</div>

	<div class="page-content">
		<!-- Email Settings -->
		<div class="notifications-section">
			<div class="section-header">
				<h2>Email notifications</h2>
				<p class="section-description">Manage automated emails sent to customers and staff</p>
			</div>

			<div class="notifications-categories">
				<!-- Customer Notifications -->
				<div class="category-card">
					<div class="category-header">
						<h3>Customer notifications</h3>
						<p>Emails sent to customers</p>
					</div>
					<div class="notifications-list">
						{#each getCustomerNotifications() as notification}
							<div class="notification-item">
								<div class="notification-info">
									<h4>{notification.title}</h4>
									<p>{notification.description}</p>
								</div>
								<div class="notification-controls">
									<button class="preview-btn" onclick={() => previewEmail(notification)}>
										Preview
									</button>
									<label class="toggle-switch">
										<input 
											type="checkbox" 
											checked={notification.enabled}
											onchange={() => toggleNotification(emailNotifications, notification.id)}
										/>
										<span class="toggle-slider"></span>
									</label>
								</div>
							</div>
						{/each}
					</div>
				</div>

				<!-- Admin Notifications -->
				<div class="category-card">
					<div class="category-header">
						<h3>Admin notifications</h3>
						<p>Emails sent to store administrators</p>
					</div>
					<div class="notifications-list">
						{#each getAdminNotifications() as notification}
							<div class="notification-item">
								<div class="notification-info">
									<h4>{notification.title}</h4>
									<p>{notification.description}</p>
								</div>
								<div class="notification-controls">
									<button class="preview-btn" onclick={() => previewEmail(notification)}>
										Preview
									</button>
									<label class="toggle-switch">
										<input 
											type="checkbox" 
											checked={notification.enabled}
											onchange={() => toggleNotification(emailNotifications, notification.id)}
										/>
										<span class="toggle-slider"></span>
									</label>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>

		<!-- SMS Notifications -->
		<div class="notifications-section">
			<div class="section-header">
				<h2>SMS notifications</h2>
				<p class="section-description">Send text message updates to customers</p>
			</div>

			<div class="sms-settings">
				<div class="sms-toggle-card">
					<div class="toggle-header">
						<div class="toggle-info">
							<h3>Enable SMS notifications</h3>
							<p>Allow sending SMS updates to customers who opt in</p>
						</div>
						<label class="toggle-switch large">
							<input type="checkbox" bind:checked={generalSettings.enableSms} />
							<span class="toggle-slider"></span>
						</label>
					</div>
				</div>

				{#if generalSettings.enableSms}
					<div class="sms-config">
						<div class="config-header">
							<h3>SMS configuration</h3>
							<p>Configure your Twilio settings to send SMS notifications</p>
						</div>
						<div class="config-form">
							<div class="form-row">
								<div class="form-group">
									<label>Account SID</label>
									<input 
										type="text" 
										bind:value={generalSettings.twilioAccountSid}
										placeholder="ACxxxxxxxxxxxxxxxxx"
										class="form-input"
									/>
								</div>
								<div class="form-group">
									<label>Auth Token</label>
									<input 
										type="password" 
										bind:value={generalSettings.twilioAuthToken}
										placeholder="Your Twilio Auth Token"
										class="form-input"
									/>
								</div>
							</div>
							<div class="form-group">
								<label>Phone Number</label>
								<input 
									type="text" 
									bind:value={generalSettings.twilioPhoneNumber}
									placeholder="+1234567890"
									class="form-input"
								/>
							</div>
						</div>

						<div class="sms-notifications-list">
							{#each smsNotifications as notification}
								<div class="notification-item">
									<div class="notification-info">
										<h4>{notification.title}</h4>
										<p>{notification.description}</p>
									</div>
									<div class="notification-controls">
										<label class="toggle-switch">
											<input 
												type="checkbox" 
												checked={notification.enabled}
												onchange={() => toggleNotification(smsNotifications, notification.id)}
											/>
											<span class="toggle-slider"></span>
										</label>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- Email Settings -->
		<div class="notifications-section">
			<div class="section-header">
				<h2>Email settings</h2>
				<p class="section-description">Configure sender information and email preferences</p>
			</div>

			<div class="email-settings-form">
				<div class="form-row">
					<div class="form-group">
						<label>Sender name</label>
						<input 
							type="text" 
							bind:value={generalSettings.senderName}
							class="form-input"
						/>
					</div>
					<div class="form-group">
						<label>Sender email</label>
						<input 
							type="email" 
							bind:value={generalSettings.senderEmail}
							class="form-input"
						/>
					</div>
				</div>
				<div class="form-group">
					<label>Reply-to email</label>
					<input 
						type="email" 
						bind:value={generalSettings.replyToEmail}
						class="form-input"
					/>
					<p class="field-help">Customers will send replies to this email address</p>
				</div>
			</div>
		</div>

		<!-- Webhooks -->
		<div class="notifications-section">
			<div class="section-header">
				<h2>Webhooks</h2>
				<p class="section-description">Send HTTP notifications to external services when events occur</p>
			</div>

			<div class="webhooks-config">
				<div class="webhook-item">
					<div class="webhook-info">
						<h4>Order created</h4>
						<p>Called when a new order is placed</p>
					</div>
					<div class="webhook-controls">
						<input 
							type="url" 
							bind:value={webhookSettings.orderCreated}
							placeholder="https://your-app.com/webhooks/order-created"
							class="webhook-input"
						/>
						<button class="test-btn" onclick={() => testWebhook('order-created')}>Test</button>
					</div>
				</div>

				<div class="webhook-item">
					<div class="webhook-info">
						<h4>Order updated</h4>
						<p>Called when an order is modified</p>
					</div>
					<div class="webhook-controls">
						<input 
							type="url" 
							bind:value={webhookSettings.orderUpdated}
							placeholder="https://your-app.com/webhooks/order-updated"
							class="webhook-input"
						/>
						<button class="test-btn" onclick={() => testWebhook('order-updated')}>Test</button>
					</div>
				</div>

				<div class="webhook-item">
					<div class="webhook-info">
						<h4>Payment received</h4>
						<p>Called when payment is confirmed</p>
					</div>
					<div class="webhook-controls">
						<input 
							type="url" 
							bind:value={webhookSettings.orderPaid}
							placeholder="https://your-app.com/webhooks/payment-received"
							class="webhook-input"
						/>
						<button class="test-btn" onclick={() => testWebhook('payment-received')}>Test</button>
					</div>
				</div>

				<div class="webhook-item">
					<div class="webhook-info">
						<h4>Order fulfilled</h4>
						<p>Called when an order is shipped</p>
					</div>
					<div class="webhook-controls">
						<input 
							type="url" 
							bind:value={webhookSettings.orderFulfilled}
							placeholder="https://your-app.com/webhooks/order-fulfilled"
							class="webhook-input"
						/>
						<button class="test-btn" onclick={() => testWebhook('order-fulfilled')}>Test</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Save Actions -->
		<div class="actions-section">
			<button class="btn-primary">Save notification settings</button>
		</div>
	</div>
</div>

<style>
	.page {
		min-height: 100vh;
		background: #f6f6f7;
	}

	.page-header {
		background: white;
		border-bottom: 1px solid #e1e1e1;
		padding: 1rem 2rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.header-content h1 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #202223;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.page-icon {
		font-size: 1rem;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		color: #6d7175;
		font-size: 0.875rem;
	}

	.breadcrumb-separator {
		margin: 0 0.5rem;
		color: #d1d5db;
	}

	.page-content {
		padding: 2rem;
		max-width: 1000px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 3rem;
	}

	.notifications-section {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.section-header h2 {
		margin: 0 0 0.5rem 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #202223;
	}

	.section-description {
		margin: 0;
		color: #6d7175;
		font-size: 0.875rem;
	}

	.notifications-categories {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
		gap: 2rem;
	}

	.category-card {
		background: white;
		border: 1px solid #e1e1e1;
		border-radius: 12px;
		padding: 2rem;
	}

	.category-header {
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid #f0f0f0;
	}

	.category-header h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: #202223;
	}

	.category-header p {
		margin: 0;
		color: #6d7175;
		font-size: 0.875rem;
	}

	.notifications-list, .sms-notifications-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.notification-item {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		padding: 1rem;
		background: #f9fafb;
		border-radius: 8px;
		border: 1px solid #f0f0f0;
	}

	.notification-info h4 {
		margin: 0 0 0.25rem 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #202223;
	}

	.notification-info p {
		margin: 0;
		font-size: 0.8125rem;
		color: #6d7175;
		line-height: 1.4;
	}

	.notification-controls {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-shrink: 0;
	}

	.preview-btn, .test-btn {
		background: none;
		border: 1px solid #c9cccf;
		color: #6d7175;
		padding: 0.375rem 0.75rem;
		border-radius: 6px;
		font-size: 0.8125rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.preview-btn:hover, .test-btn:hover {
		background: #f6f6f7;
		color: #202223;
	}

	.toggle-switch {
		position: relative;
		display: inline-block;
		width: 44px;
		height: 24px;
	}

	.toggle-switch.large {
		width: 52px;
		height: 28px;
	}

	.toggle-switch input {
		opacity: 0;
		width: 0;
		height: 0;
	}

	.toggle-slider {
		position: absolute;
		cursor: pointer;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: #ccc;
		transition: .4s;
		border-radius: 24px;
	}

	.toggle-slider:before {
		position: absolute;
		content: "";
		height: 18px;
		width: 18px;
		left: 3px;
		bottom: 3px;
		background-color: white;
		transition: .4s;
		border-radius: 50%;
	}

	.toggle-switch.large .toggle-slider:before {
		height: 22px;
		width: 22px;
	}

	input:checked + .toggle-slider {
		background-color: #10b981;
	}

	input:checked + .toggle-slider:before {
		transform: translateX(20px);
	}

	.toggle-switch.large input:checked + .toggle-slider:before {
		transform: translateX(24px);
	}

	.sms-settings {
		background: white;
		border: 1px solid #e1e1e1;
		border-radius: 12px;
		padding: 2rem;
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.sms-toggle-card {
		padding: 1.5rem;
		background: #f9fafb;
		border-radius: 8px;
		border: 1px solid #f0f0f0;
	}

	.toggle-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	.toggle-info h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1rem;
		font-weight: 600;
		color: #202223;
	}

	.toggle-info p {
		margin: 0;
		color: #6d7175;
		font-size: 0.875rem;
	}

	.sms-config {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.config-header h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1rem;
		font-weight: 600;
		color: #202223;
	}

	.config-header p {
		margin: 0;
		color: #6d7175;
		font-size: 0.875rem;
	}

	.config-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-group label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #202223;
	}

	.form-input {
		padding: 0.75rem;
		border: 1px solid #c9cccf;
		border-radius: 6px;
		font-size: 0.875rem;
	}

	.form-input:focus {
		outline: none;
		border-color: #005bd3;
		box-shadow: 0 0 0 2px rgba(0, 91, 211, 0.1);
	}

	.field-help {
		margin: 0;
		font-size: 0.8125rem;
		color: #6d7175;
	}

	.email-settings-form {
		background: white;
		border: 1px solid #e1e1e1;
		border-radius: 12px;
		padding: 2rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.webhooks-config {
		background: white;
		border: 1px solid #e1e1e1;
		border-radius: 12px;
		padding: 2rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.webhook-item {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 2rem;
		padding: 1.5rem;
		background: #f9fafb;
		border-radius: 8px;
		border: 1px solid #f0f0f0;
	}

	.webhook-info {
		flex-shrink: 0;
		min-width: 200px;
	}

	.webhook-info h4 {
		margin: 0 0 0.25rem 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #202223;
	}

	.webhook-info p {
		margin: 0;
		font-size: 0.8125rem;
		color: #6d7175;
	}

	.webhook-controls {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		flex: 1;
	}

	.webhook-input {
		flex: 1;
		padding: 0.75rem;
		border: 1px solid #c9cccf;
		border-radius: 6px;
		font-size: 0.875rem;
		font-family: monospace;
	}

	.webhook-input:focus {
		outline: none;
		border-color: #005bd3;
		box-shadow: 0 0 0 2px rgba(0, 91, 211, 0.1);
	}

	.actions-section {
		display: flex;
		justify-content: flex-end;
		padding: 2rem 0;
	}

	.btn-primary {
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
		border: none;
		background: #202223;
		color: white;
	}

	.btn-primary:hover {
		background: #1a1a1a;
	}

	@media (max-width: 768px) {
		.page-content {
			padding: 1rem;
		}

		.notifications-categories {
			grid-template-columns: 1fr;
		}

		.notification-item {
			flex-direction: column;
			gap: 1rem;
			align-items: stretch;
		}

		.notification-controls {
			justify-content: space-between;
		}

		.form-row {
			grid-template-columns: 1fr;
		}

		.webhook-item {
			flex-direction: column;
			gap: 1rem;
		}

		.webhook-controls {
			flex-direction: column;
			align-items: stretch;
		}

		.toggle-header {
			flex-direction: column;
			gap: 1rem;
			align-items: stretch;
		}
	}
</style>