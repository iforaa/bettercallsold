export async function load() {
	// Mock data for purchase orders - in production this would come from the database
	const mockPurchaseOrders = [
		{
			id: 'PO-2025-001',
			supplier: {
				name: 'Fashion Wholesale Co.',
				email: 'orders@fashionwholesale.com',
				phone: '+1 (555) 123-4567'
			},
			status: 'pending',
			orderDate: '2025-01-15',
			expectedDelivery: '2025-01-25',
			totalAmount: 2840.50,
			items: [
				{
					productName: 'Airflow Drawstring Pants',
					sku: 'AIRFLOW-001',
					color: 'Black',
					size: 'Medium',
					quantity: 50,
					unitCost: 18.50,
					totalCost: 925.00
				},
				{
					productName: 'Cotton Basic Tee',
					sku: 'COTTON-TEE-002',
					color: 'White',
					size: 'Large',
					quantity: 100,
					unitCost: 12.75,
					totalCost: 1275.00
				},
				{
					productName: 'Denim Jacket Classic',
					sku: 'DENIM-JKT-003',
					color: 'Blue',
					size: 'Small',
					quantity: 25,
					unitCost: 25.60,
					totalCost: 640.50
				}
			],
			notes: 'Rush order for spring collection launch'
		},
		{
			id: 'PO-2025-002',
			supplier: {
				name: 'Urban Style Suppliers',
				email: 'purchasing@urbanstyle.com',
				phone: '+1 (555) 987-6543'
			},
			status: 'shipped',
			orderDate: '2025-01-10',
			expectedDelivery: '2025-01-20',
			shippedDate: '2025-01-18',
			trackingNumber: 'UPS1234567890',
			totalAmount: 1950.25,
			items: [
				{
					productName: 'Floral Print Dress',
					sku: 'FLORAL-DRESS-001',
					color: 'Pink',
					size: 'Medium',
					quantity: 30,
					unitCost: 22.50,
					totalCost: 675.00
				},
				{
					productName: 'Leather Handbag',
					sku: 'LEATHER-BAG-002',
					color: 'Brown',
					size: 'One Size',
					quantity: 15,
					unitCost: 45.75,
					totalCost: 686.25
				},
				{
					productName: 'Summer Sandals',
					sku: 'SANDALS-003',
					color: 'Tan',
					size: '8',
					quantity: 20,
					unitCost: 29.45,
					totalCost: 589.00
				}
			],
			notes: 'Standard restock order - verify quality upon receipt'
		},
		{
			id: 'PO-2025-003',
			supplier: {
				name: 'Premium Accessories Ltd.',
				email: 'orders@premiumacc.com',
				phone: '+1 (555) 456-7890'
			},
			status: 'delivered',
			orderDate: '2025-01-05',
			expectedDelivery: '2025-01-15',
			shippedDate: '2025-01-12',
			deliveredDate: '2025-01-14',
			trackingNumber: 'FDX9876543210',
			totalAmount: 3250.75,
			items: [
				{
					productName: 'Gold Statement Necklace',
					sku: 'GOLD-NECK-001',
					color: 'Gold',
					size: 'One Size',
					quantity: 12,
					unitCost: 85.50,
					totalCost: 1026.00
				},
				{
					productName: 'Silver Earring Set',
					sku: 'SILVER-EAR-002',
					color: 'Silver',
					size: 'One Size',
					quantity: 25,
					unitCost: 32.75,
					totalCost: 818.75
				},
				{
					productName: 'Designer Watch',
					sku: 'WATCH-003',
					color: 'Black',
					size: 'One Size',
					quantity: 8,
					unitCost: 175.50,
					totalCost: 1404.00
				}
			],
			notes: 'High-value items - inspect immediately upon delivery'
		},
		{
			id: 'PO-2025-004',
			supplier: {
				name: 'Seasonal Trends Inc.',
				email: 'orders@seasonaltrends.com',
				phone: '+1 (555) 321-0987'
			},
			status: 'draft',
			orderDate: null,
			expectedDelivery: null,
			totalAmount: 1580.00,
			items: [
				{
					productName: 'Winter Coat Heavy',
					sku: 'WINTER-COAT-001',
					color: 'Navy',
					size: 'Large',
					quantity: 20,
					unitCost: 65.50,
					totalCost: 1310.00
				},
				{
					productName: 'Wool Scarf',
					sku: 'WOOL-SCARF-002',
					color: 'Grey',
					size: 'One Size',
					quantity: 15,
					unitCost: 18.00,
					totalCost: 270.00
				}
			],
			notes: 'Draft order - waiting for winter season confirmation'
		}
	];

	const mockSuppliers = [
		{
			id: 'SUPP-001',
			name: 'Fashion Wholesale Co.',
			email: 'orders@fashionwholesale.com',
			phone: '+1 (555) 123-4567',
			address: '123 Fashion District, NY 10001',
			paymentTerms: 'Net 30',
			category: 'Clothing'
		},
		{
			id: 'SUPP-002',
			name: 'Urban Style Suppliers',
			email: 'purchasing@urbanstyle.com',
			phone: '+1 (555) 987-6543',
			address: '456 Urban Ave, CA 90210',
			paymentTerms: 'Net 15',
			category: 'Accessories'
		},
		{
			id: 'SUPP-003',
			name: 'Premium Accessories Ltd.',
			email: 'orders@premiumacc.com',
			phone: '+1 (555) 456-7890',
			address: '789 Luxury Lane, FL 33101',
			paymentTerms: 'Net 45',
			category: 'Jewelry'
		},
		{
			id: 'SUPP-004',
			name: 'Seasonal Trends Inc.',
			email: 'orders@seasonaltrends.com',
			phone: '+1 (555) 321-0987',
			address: '321 Trend St, TX 75201',
			paymentTerms: 'Net 30',
			category: 'Seasonal'
		}
	];

	return {
		purchaseOrders: mockPurchaseOrders,
		suppliers: mockSuppliers
	};
}