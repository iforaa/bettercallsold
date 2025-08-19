import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';

export async function GET({ url }) {
  try {
    const collectionId = url.searchParams.get('collection_id');
    const includeColors = url.searchParams.get('include_colors') !== 'false';
    const includeSizes = url.searchParams.get('include_sizes') !== 'false';
    const includeBrands = url.searchParams.get('include_brands') !== 'false';
    const includePriceRanges = url.searchParams.get('include_price_ranges') !== 'false';

    // Build query to get products for filtering
    let queryText = `
      SELECT 
        COALESCE(p_old.variants, '[]') as variants,
        COALESCE(p_new.tags, p_old.tags) as tags,
        COALESCE(p_new.vendor, p_old.brand) as brand,
        COALESCE(p_old.price, 0) as price,
        COALESCE(p_new.title, p_old.name) as name
      FROM products_new p_new
      FULL OUTER JOIN products_old p_old ON p_new.id = p_old.id
    `;

    let params = [DEFAULT_TENANT_ID];
    let paramIndex = 2;

    // Add collection filter if specified
    if (collectionId) {
      queryText += `
        INNER JOIN product_collections pc ON (p_new.id = pc.product_id OR p_old.id = pc.product_id)
      `;
    }

    queryText += ` WHERE (p_new.tenant_id = $1 OR p_old.tenant_id = $1) AND (p_new.status = 'active' OR p_old.status = 'active')`;

    if (collectionId) {
      queryText += ` AND pc.collection_id = $${paramIndex}`;
      params.push(parseInt(collectionId));
      paramIndex++;
    }

    const result = await query(queryText, params);
    const products = result.rows;

    // Extract filters from products
    const filters = {
      colors: includeColors ? extractColors(products) : [],
      sizes: includeSizes ? extractSizes(products) : [],
      brands: includeBrands ? extractBrands(products) : [],
      price_ranges: includePriceRanges ? extractPriceRanges(products) : []
    };

    return jsonResponse({
      filters: filters,
      total_products: products.length,
      collection_id: collectionId ? parseInt(collectionId) : null
    });

  } catch (error) {
    console.error('Mobile filters API error:', error);
    return internalServerErrorResponse(`Failed to fetch filters: ${error.message}`);
  }
}

function extractColors(products) {
  const colorSet = new Set();
  const colorCounts = new Map();

  products.forEach(product => {
    // Extract colors from variants
    try {
      const variants = product.variants ? 
        (typeof product.variants === 'string' ? JSON.parse(product.variants) : product.variants) : 
        [];
      
      variants.forEach(variant => {
        // Check various color fields
        const possibleColors = [
          variant.color,
          variant.option2_value, // Usually color in Shopify format
          variant.colour
        ].filter(Boolean);

        possibleColors.forEach(color => {
          if (color && typeof color === 'string') {
            const normalizedColor = color.trim().toLowerCase();
            if (normalizedColor && normalizedColor !== 'default' && normalizedColor !== 'n/a') {
              colorSet.add(color.trim());
              colorCounts.set(color.trim(), (colorCounts.get(color.trim()) || 0) + 1);
            }
          }
        });
      });
    } catch (e) {
      // Skip invalid variants
    }

    // Extract colors from tags
    try {
      const tags = product.tags ? 
        (Array.isArray(product.tags) ? product.tags : JSON.parse(product.tags)) : 
        [];
      
      tags.forEach(tag => {
        if (typeof tag === 'string') {
          const lowerTag = tag.toLowerCase();
          // Common color keywords
          const colorKeywords = [
            'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown',
            'black', 'white', 'gray', 'grey', 'navy', 'maroon', 'teal', 'lime',
            'olive', 'aqua', 'silver', 'gold', 'beige', 'tan', 'khaki', 'coral',
            'salmon', 'crimson', 'magenta', 'cyan', 'indigo', 'violet', 'turquoise'
          ];
          
          colorKeywords.forEach(colorKeyword => {
            if (lowerTag.includes(colorKeyword)) {
              const capitalizedColor = colorKeyword.charAt(0).toUpperCase() + colorKeyword.slice(1);
              colorSet.add(capitalizedColor);
              colorCounts.set(capitalizedColor, (colorCounts.get(capitalizedColor) || 0) + 1);
            }
          });
        }
      });
    } catch (e) {
      // Skip invalid tags
    }
  });

  // Convert to array with counts, sorted by frequency
  return Array.from(colorSet)
    .map(color => ({
      name: color,
      value: color.toLowerCase(),
      count: colorCounts.get(color) || 0,
      hex_color: getColorHex(color) // Helper function for color codes
    }))
    .sort((a, b) => b.count - a.count);
}

function extractSizes(products) {
  const sizeSet = new Set();
  const sizeCounts = new Map();

  products.forEach(product => {
    try {
      const variants = product.variants ? 
        (typeof product.variants === 'string' ? JSON.parse(product.variants) : product.variants) : 
        [];
      
      variants.forEach(variant => {
        // Check various size fields
        const possibleSizes = [
          variant.size,
          variant.option1_value, // Usually size in Shopify format
          variant.option3_value
        ].filter(Boolean);

        possibleSizes.forEach(size => {
          if (size && typeof size === 'string') {
            const normalizedSize = size.trim().toUpperCase();
            if (normalizedSize && normalizedSize !== 'DEFAULT' && normalizedSize !== 'ONE SIZE') {
              // Standard size patterns
              const sizePatterns = [
                /^(XXS|XS|S|M|L|XL|XXL|XXXL)$/i,
                /^\d{1,2}$/,
                /^\d{1,2}[A-Z]?$/,
                /^(ONE SIZE|OS)$/i
              ];

              if (sizePatterns.some(pattern => pattern.test(normalizedSize))) {
                sizeSet.add(normalizedSize);
                sizeCounts.set(normalizedSize, (sizeCounts.get(normalizedSize) || 0) + 1);
              }
            }
          }
        });
      });
    } catch (e) {
      // Skip invalid variants
    }
  });

  // Convert to array with counts, sorted by standard size order
  const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
  
  return Array.from(sizeSet)
    .map(size => ({
      name: size,
      value: size.toLowerCase(),
      count: sizeCounts.get(size) || 0,
      sort_order: sizeOrder.indexOf(size) !== -1 ? sizeOrder.indexOf(size) : 999
    }))
    .sort((a, b) => {
      if (a.sort_order !== b.sort_order) {
        return a.sort_order - b.sort_order;
      }
      return b.count - a.count;
    });
}

function extractBrands(products) {
  const brandSet = new Set();
  const brandCounts = new Map();

  products.forEach(product => {
    if (product.brand && typeof product.brand === 'string') {
      const brand = product.brand.trim();
      if (brand && brand !== 'Unknown' && brand !== 'N/A') {
        brandSet.add(brand);
        brandCounts.set(brand, (brandCounts.get(brand) || 0) + 1);
      }
    }
  });

  return Array.from(brandSet)
    .map(brand => ({
      name: brand,
      value: brand.toLowerCase(),
      count: brandCounts.get(brand) || 0
    }))
    .sort((a, b) => b.count - a.count);
}

function extractPriceRanges(products) {
  const prices = products
    .map(product => product.price)
    .filter(price => price && price > 0)
    .sort((a, b) => a - b);

  if (prices.length === 0) {
    return [];
  }

  const minPrice = prices[0];
  const maxPrice = prices[prices.length - 1];

  // Create price ranges
  const ranges = [
    { name: 'Under $25', min: 0, max: 25 },
    { name: '$25 - $50', min: 25, max: 50 },
    { name: '$50 - $100', min: 50, max: 100 },
    { name: '$100 - $200', min: 100, max: 200 },
    { name: '$200+', min: 200, max: Infinity }
  ];

  // Count products in each range
  return ranges
    .map(range => {
      const count = prices.filter(price => price >= range.min && price < range.max).length;
      return {
        name: range.name,
        min_price: range.min,
        max_price: range.max === Infinity ? null : range.max,
        count: count,
        value: `${range.min}-${range.max === Infinity ? 'max' : range.max}`
      };
    })
    .filter(range => range.count > 0);
}

function getColorHex(colorName) {
  // Basic color mapping - can be enhanced
  const colorMap = {
    'red': '#FF0000',
    'blue': '#0000FF',
    'green': '#008000',
    'yellow': '#FFFF00',
    'orange': '#FFA500',
    'purple': '#800080',
    'pink': '#FFC0CB',
    'brown': '#A52A2A',
    'black': '#000000',
    'white': '#FFFFFF',
    'gray': '#808080',
    'grey': '#808080',
    'navy': '#000080',
    'maroon': '#800000',
    'teal': '#008080',
    'lime': '#00FF00',
    'olive': '#808000',
    'aqua': '#00FFFF',
    'silver': '#C0C0C0',
    'gold': '#FFD700'
  };

  return colorMap[colorName.toLowerCase()] || null;
}