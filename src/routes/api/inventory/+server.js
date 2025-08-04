import { 
  getProductsWithInventory, 
  getLowStockProducts, 
  getInventoryValue,
  searchProductsWithInventory 
} from '$lib/inventory-db.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

export async function GET({ url }) {
  try {
    const searchParams = url.searchParams;
    const action = searchParams.get('action');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit')) || 50;
    const offset = parseInt(searchParams.get('offset')) || 0;
    const threshold = parseInt(searchParams.get('threshold')) || 5;

    switch (action) {
      case 'low_stock':
        const lowStockProducts = await getLowStockProducts(DEFAULT_TENANT_ID, threshold);
        return jsonResponse(lowStockProducts);

      case 'value':
        const inventoryValue = await getInventoryValue(DEFAULT_TENANT_ID);
        return jsonResponse(inventoryValue);

      case 'search':
        if (!search) {
          return jsonResponse([]);
        }
        const searchResults = await searchProductsWithInventory(DEFAULT_TENANT_ID, search, limit);
        return jsonResponse(searchResults);

      default:
        // Default: get all products with inventory
        const products = await getProductsWithInventory(DEFAULT_TENANT_ID, limit, offset);
        return jsonResponse(products);
    }
  } catch (error) {
    console.error('Get inventory error:', error);
    return internalServerErrorResponse('Failed to fetch inventory data');
  }
}