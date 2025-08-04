import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, badRequestResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';

export async function POST({ request }) {
  try {
    const { format, scope, productIds, status } = await request.json();

    // Validate input
    if (!format || !scope) {
      return badRequestResponse('Missing required parameters: format and scope');
    }

    // Build query based on scope
    let queryText = `
      SELECT 
        p.*,
        COALESCE(pc.collection_names, '[]') as collection_names
      FROM products p
      LEFT JOIN (
        SELECT 
          product_id,
          json_agg(c.name) as collection_names
        FROM product_collections pc
        JOIN collections c ON pc.collection_id = c.id
        WHERE c.tenant_id = $1
        GROUP BY product_id
      ) pc ON p.id = pc.product_id
      WHERE p.tenant_id = $1
    `;
    
    let queryParams = [DEFAULT_TENANT_ID];
    let paramIndex = 2;

    // Add scope-specific filters
    if (scope === 'selected' && productIds && productIds.length > 0) {
      queryText += ` AND p.id = ANY($${paramIndex})`;
      queryParams.push(productIds);
      paramIndex++;
    } else if (scope === 'current-page' && status && status !== 'all') {
      queryText += ` AND p.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }
    // For 'all-products', no additional filters needed

    queryText += ` ORDER BY p.created_at DESC`;

    // Execute query
    const result = await query(queryText, queryParams);
    const products = result.rows;

    if (products.length === 0) {
      return badRequestResponse('No products found to export');
    }

    // Generate file based on format
    let fileBuffer;
    let filename;
    let mimeType;

    if (format === 'csv-excel') {
      // Generate Excel file
      const { buffer, name } = await generateExcelFile(products);
      fileBuffer = buffer;
      filename = name;
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else {
      // Generate plain CSV
      const { buffer, name } = await generateCSVFile(products);
      fileBuffer = buffer;
      filename = name;
      mimeType = 'text/csv';
    }

    // Create ZIP file
    const zip = new JSZip();
    zip.file(filename, fileBuffer);
    
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    const zipFilename = `products-export-${new Date().toISOString().split('T')[0]}.zip`;

    return new Response(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFilename}"`
      }
    });

  } catch (error) {
    console.error('Export error:', error);
    return internalServerErrorResponse('Failed to export products: ' + error.message);
  }
}

async function generateExcelFile(products) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Products');

  // Define columns
  const columns = [
    { header: 'Handle', key: 'handle', width: 20 },
    { header: 'Title', key: 'title', width: 30 },
    { header: 'Body (HTML)', key: 'body_html', width: 40 },
    { header: 'Vendor', key: 'vendor', width: 15 },
    { header: 'Product Category', key: 'product_category', width: 20 },
    { header: 'Type', key: 'type', width: 15 },
    { header: 'Tags', key: 'tags', width: 30 },
    { header: 'Published', key: 'published', width: 10 },
    { header: 'Option1 Name', key: 'option1_name', width: 15 },
    { header: 'Option1 Value', key: 'option1_value', width: 15 },
    { header: 'Option2 Name', key: 'option2_name', width: 15 },
    { header: 'Option2 Value', key: 'option2_value', width: 15 },
    { header: 'Option3 Name', key: 'option3_name', width: 15 },
    { header: 'Option3 Value', key: 'option3_value', width: 15 },
    { header: 'Variant SKU', key: 'variant_sku', width: 20 },
    { header: 'Variant Grams', key: 'variant_grams', width: 15 },
    { header: 'Variant Inventory Tracker', key: 'variant_inventory_tracker', width: 25 },
    { header: 'Variant Inventory Qty', key: 'variant_inventory_qty', width: 20 },
    { header: 'Variant Inventory Policy', key: 'variant_inventory_policy', width: 25 },
    { header: 'Variant Fulfillment Service', key: 'variant_fulfillment_service', width: 25 },
    { header: 'Variant Price', key: 'variant_price', width: 15 },
    { header: 'Variant Compare At Price', key: 'variant_compare_at_price', width: 25 },
    { header: 'Variant Requires Shipping', key: 'variant_requires_shipping', width: 25 },
    { header: 'Variant Taxable', key: 'variant_taxable', width: 15 },
    { header: 'Variant Barcode', key: 'variant_barcode', width: 20 },
    { header: 'Image Src', key: 'image_src', width: 50 },
    { header: 'Image Position', key: 'image_position', width: 15 },
    { header: 'Image Alt Text', key: 'image_alt_text', width: 30 },
    { header: 'Gift Card', key: 'gift_card', width: 10 },
    { header: 'SEO Title', key: 'seo_title', width: 30 },
    { header: 'SEO Description', key: 'seo_description', width: 40 },
    { header: 'Google Shopping / Google Product Category', key: 'google_shopping_category', width: 40 },
    { header: 'Google Shopping / Gender', key: 'google_shopping_gender', width: 20 },
    { header: 'Google Shopping / Age Group', key: 'google_shopping_age_group', width: 25 },
    { header: 'Google Shopping / MPN', key: 'google_shopping_mpn', width: 20 },
    { header: 'Google Shopping / AdWords Grouping', key: 'google_shopping_adwords_grouping', width: 30 },
    { header: 'Google Shopping / AdWords Labels', key: 'google_shopping_adwords_labels', width: 30 },
    { header: 'Google Shopping / Condition', key: 'google_shopping_condition', width: 25 },
    { header: 'Google Shopping / Custom Product', key: 'google_shopping_custom_product', width: 30 },
    { header: 'Google Shopping / Custom Label 0', key: 'google_shopping_custom_label_0', width: 30 },
    { header: 'Google Shopping / Custom Label 1', key: 'google_shopping_custom_label_1', width: 30 },
    { header: 'Google Shopping / Custom Label 2', key: 'google_shopping_custom_label_2', width: 30 },
    { header: 'Google Shopping / Custom Label 3', key: 'google_shopping_custom_label_3', width: 30 },
    { header: 'Google Shopping / Custom Label 4', key: 'google_shopping_custom_label_4', width: 30 },
    { header: 'Variant Image', key: 'variant_image', width: 50 },
    { header: 'Variant Weight Unit', key: 'variant_weight_unit', width: 20 },
    { header: 'Variant Tax Code', key: 'variant_tax_code', width: 20 },
    { header: 'Cost per item', key: 'cost_per_item', width: 15 },
    { header: 'Price / International', key: 'price_international', width: 20 },
    { header: 'Compare At Price / International', key: 'compare_at_price_international', width: 30 },
    { header: 'Status', key: 'status', width: 15 }
  ];

  worksheet.columns = columns;

  // Process each product and its variants
  for (const product of products) {
    // Parse JSON fields safely
    let variants = [];
    let images = [];
    let tags = [];
    let collections = [];

    try {
      variants = product.variants ? (typeof product.variants === 'string' ? JSON.parse(product.variants) : product.variants) : [];
    } catch (e) {
      variants = [];
    }

    try {
      images = product.images ? (typeof product.images === 'string' ? JSON.parse(product.images) : product.images) : [];
    } catch (e) {
      images = [];
    }

    try {
      tags = product.tags ? (Array.isArray(product.tags) ? product.tags : JSON.parse(product.tags)) : [];
    } catch (e) {
      tags = [];
    }

    try {
      collections = product.collection_names ? (typeof product.collection_names === 'string' ? JSON.parse(product.collection_names) : product.collection_names) : [];
    } catch (e) {
      collections = [];
    }

    // Generate handle from name
    const handle = product.name ? product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : '';

    // Create base row data
    const baseRowData = {
      handle: handle,
      title: product.name || '',
      body_html: product.description || '',
      vendor: product.brand || '',
      product_category: '',
      type: product.product_type || '',
      tags: Array.isArray(tags) ? tags.join(', ') : '',
      published: product.status === 'active' ? 'TRUE' : 'FALSE',
      gift_card: 'FALSE',
      seo_title: product.name || '',
      seo_description: product.description ? product.description.substring(0, 160) : '',
      status: product.status || 'draft'
    };

    // If no variants, create a single row
    if (!variants || variants.length === 0) {
      const rowData = {
        ...baseRowData,
        variant_sku: product.sku || '',
        variant_inventory_tracker: 'shopify',
        variant_inventory_qty: product.inventory_count || 0,
        variant_inventory_policy: 'deny',
        variant_fulfillment_service: 'manual',
        variant_price: product.price || 0,
        variant_compare_at_price: '',
        variant_requires_shipping: 'TRUE',
        variant_taxable: 'TRUE',
        variant_barcode: product.barcode || '',
        variant_grams: 0,
        variant_weight_unit: 'kg',
        cost_per_item: '',
        image_src: images.length > 0 ? (typeof images[0] === 'string' ? images[0] : images[0]?.url || '') : '',
        image_position: images.length > 0 ? '1' : '',
        image_alt_text: images.length > 0 ? product.name : ''
      };
      
      worksheet.addRow(rowData);
    } else {
      // Create row for each variant
      variants.forEach((variant, variantIndex) => {
        const rowData = {
          ...baseRowData,
          // Only show product info on first variant row
          title: variantIndex === 0 ? baseRowData.title : '',
          body_html: variantIndex === 0 ? baseRowData.body_html : '',
          vendor: variantIndex === 0 ? baseRowData.vendor : '',
          type: variantIndex === 0 ? baseRowData.type : '',
          tags: variantIndex === 0 ? baseRowData.tags : '',
          published: variantIndex === 0 ? baseRowData.published : '',
          
          // Variant-specific data
          option1_name: variant.option1_name || 'Title',
          option1_value: variant.option1_value || 'Default Title',
          option2_name: variant.option2_name || '',
          option2_value: variant.option2_value || '',
          option3_name: variant.option3_name || '',
          option3_value: variant.option3_value || '',
          variant_sku: variant.sku || '',
          variant_inventory_tracker: 'shopify',
          variant_inventory_qty: variant.inventory_count || 0,
          variant_inventory_policy: 'deny',
          variant_fulfillment_service: 'manual',
          variant_price: variant.price || product.price || 0,
          variant_compare_at_price: variant.compare_at_price || '',
          variant_requires_shipping: 'TRUE',
          variant_taxable: 'TRUE',
          variant_barcode: variant.barcode || '',
          variant_grams: variant.grams || 0,
          variant_weight_unit: 'kg',
          cost_per_item: variant.cost || '',
          
          // Image data
          image_src: images.length > variantIndex ? (typeof images[variantIndex] === 'string' ? images[variantIndex] : images[variantIndex]?.url || '') : '',
          image_position: images.length > variantIndex ? (variantIndex + 1).toString() : '',
          image_alt_text: images.length > variantIndex ? product.name : ''
        };
        
        worksheet.addRow(rowData);
      });
    }
  }

  // Style the header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `products-export-${new Date().toISOString().split('T')[0]}.xlsx`;
  
  return { buffer, name: filename };
}

async function generateCSVFile(products) {
  const headers = [
    'Handle', 'Title', 'Body (HTML)', 'Vendor', 'Product Category', 'Type', 'Tags', 'Published',
    'Option1 Name', 'Option1 Value', 'Option2 Name', 'Option2 Value', 'Option3 Name', 'Option3 Value',
    'Variant SKU', 'Variant Grams', 'Variant Inventory Tracker', 'Variant Inventory Qty',
    'Variant Inventory Policy', 'Variant Fulfillment Service', 'Variant Price', 'Variant Compare At Price',
    'Variant Requires Shipping', 'Variant Taxable', 'Variant Barcode', 'Image Src', 'Image Position',
    'Image Alt Text', 'Gift Card', 'SEO Title', 'SEO Description', 'Status'
  ];

  let csvContent = headers.join(',') + '\n';

  for (const product of products) {
    // Parse JSON fields safely (same logic as Excel)
    let variants = [];
    let images = [];
    let tags = [];

    try {
      variants = product.variants ? (typeof product.variants === 'string' ? JSON.parse(product.variants) : product.variants) : [];
    } catch (e) {
      variants = [];
    }

    try {
      images = product.images ? (typeof product.images === 'string' ? JSON.parse(product.images) : product.images) : [];
    } catch (e) {
      images = [];
    }

    try {
      tags = product.tags ? (Array.isArray(product.tags) ? product.tags : JSON.parse(product.tags)) : [];
    } catch (e) {
      tags = [];
    }

    const handle = product.name ? product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : '';
    
    const baseData = [
      escapeCSV(handle),
      escapeCSV(product.name || ''),
      escapeCSV(product.description || ''),
      escapeCSV(product.brand || ''),
      escapeCSV(''),
      escapeCSV(product.product_type || ''),
      escapeCSV(Array.isArray(tags) ? tags.join(', ') : ''),
      product.status === 'active' ? 'TRUE' : 'FALSE'
    ];

    if (!variants || variants.length === 0) {
      const row = [
        ...baseData,
        '', '', '', '', '', '', // Options
        escapeCSV(product.sku || ''), '0', 'shopify', product.inventory_count || 0,
        'deny', 'manual', product.price || 0, '', 'TRUE', 'TRUE', escapeCSV(product.barcode || ''),
        escapeCSV(images[0] ? (typeof images[0] === 'string' ? images[0] : images[0].url || '') : ''),
        images.length > 0 ? '1' : '', escapeCSV(product.name || ''), 'FALSE',
        escapeCSV(product.name || ''), escapeCSV(product.description ? product.description.substring(0, 160) : ''),
        escapeCSV(product.status || 'draft')
      ];
      csvContent += row.join(',') + '\n';
    } else {
      variants.forEach((variant, index) => {
        const row = [
          ...(index === 0 ? baseData : ['', '', '', '', '', '', '', '']),
          escapeCSV(variant.option1_name || 'Title'),
          escapeCSV(variant.option1_value || 'Default Title'),
          escapeCSV(variant.option2_name || ''),
          escapeCSV(variant.option2_value || ''),
          escapeCSV(variant.option3_name || ''),
          escapeCSV(variant.option3_value || ''),
          escapeCSV(variant.sku || ''), variant.grams || 0, 'shopify', variant.inventory_count || 0,
          'deny', 'manual', variant.price || product.price || 0, variant.compare_at_price || '',
          'TRUE', 'TRUE', escapeCSV(variant.barcode || ''),
          escapeCSV(images[index] ? (typeof images[index] === 'string' ? images[index] : images[index].url || '') : ''),
          images.length > index ? (index + 1).toString() : '',
          escapeCSV(product.name || ''), 'FALSE',
          index === 0 ? escapeCSV(product.name || '') : '',
          index === 0 ? escapeCSV(product.description ? product.description.substring(0, 160) : '') : '',
          index === 0 ? escapeCSV(product.status || 'draft') : ''
        ];
        csvContent += row.join(',') + '\n';
      });
    }
  }

  const buffer = Buffer.from(csvContent, 'utf8');
  const filename = `products-export-${new Date().toISOString().split('T')[0]}.csv`;
  
  return { buffer, name: filename };
}

function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}