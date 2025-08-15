import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse, badRequestResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID } from '$lib/constants.js';
import { getLiquidEngine } from '$lib/liquid/engine.js';

// Get templates
export async function GET({ url }) {
  try {
    const searchParams = url.searchParams;
    const templateType = searchParams.get('type');
    const templateName = searchParams.get('name');
    const isActive = searchParams.get('active');

    let whereClause = 'WHERE tenant_id = $1';
    const params = [DEFAULT_TENANT_ID];
    let paramIndex = 2;

    if (templateType) {
      whereClause += ` AND template_type = $${paramIndex}`;
      params.push(templateType);
      paramIndex++;
    }

    if (templateName) {
      whereClause += ` AND template_name = $${paramIndex}`;
      params.push(templateName);
      paramIndex++;
    }

    if (isActive !== null && isActive !== undefined) {
      whereClause += ` AND is_active = $${paramIndex}`;
      params.push(isActive === 'true');
      paramIndex++;
    }

    const templates = await query(`
      SELECT 
        id, tenant_id, template_type, template_name, liquid_content,
        settings_schema, default_settings, api_dependencies,
        is_active, version, created_at, updated_at
      FROM liquid_templates
      ${whereClause}
      ORDER BY template_type, template_name, version DESC
    `, params);

    return jsonResponse(templates.rows);
  } catch (error) {
    console.error('Get templates error:', error);
    return internalServerErrorResponse('Failed to fetch templates');
  }
}

// Create template
export async function POST({ request }) {
  try {
    const templateData = await request.json();

    if (!templateData.template_type || !templateData.template_name || !templateData.liquid_content) {
      return badRequestResponse('Missing required fields: template_type, template_name, liquid_content');
    }

    // Validate template type
    const validTypes = ['layout', 'page', 'section', 'snippet'];
    if (!validTypes.includes(templateData.template_type)) {
      return badRequestResponse(`Invalid template_type. Must be one of: ${validTypes.join(', ')}`);
    }

    // Validate and analyze liquid template
    const liquidEngine = getLiquidEngine();
    
    try {
      await liquidEngine.parseTemplate(templateData.liquid_content);
    } catch (error) {
      return badRequestResponse(`Invalid Liquid template: ${error.message}`);
    }

    // Analyze template for API dependencies
    const analysis = liquidEngine.analyzeTemplate(templateData.liquid_content);

    const result = await query(`
      INSERT INTO liquid_templates (
        tenant_id, template_type, template_name, liquid_content,
        settings_schema, default_settings, api_dependencies, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, created_at
    `, [
      DEFAULT_TENANT_ID,
      templateData.template_type,
      templateData.template_name,
      templateData.liquid_content,
      JSON.stringify(templateData.settings_schema || {}),
      JSON.stringify(templateData.default_settings || {}),
      JSON.stringify(analysis.apiEndpoints),
      templateData.is_active !== false
    ]);

    if (result.rows.length > 0) {
      return jsonResponse({
        success: true,
        message: 'Template created successfully',
        data: {
          id: result.rows[0].id,
          created_at: result.rows[0].created_at,
          analysis: analysis
        }
      });
    } else {
      return internalServerErrorResponse('Failed to create template');
    }
  } catch (error) {
    console.error('Create template error:', error);
    
    // Handle unique constraint violation
    if (error.code === '23505') {
      return badRequestResponse('Template with this type and name already exists');
    }
    
    return internalServerErrorResponse('Failed to create template');
  }
}

// Update template
export async function PUT({ request }) {
  try {
    const templateData = await request.json();

    if (!templateData.id) {
      return badRequestResponse('Missing required field: id');
    }

    // Validate liquid template if content is being updated
    if (templateData.liquid_content) {
      const liquidEngine = getLiquidEngine();
      
      try {
        await liquidEngine.parseTemplate(templateData.liquid_content);
      } catch (error) {
        return badRequestResponse(`Invalid Liquid template: ${error.message}`);
      }

      // Analyze template for API dependencies
      const analysis = liquidEngine.analyzeTemplate(templateData.liquid_content);
      templateData.api_dependencies = analysis.apiEndpoints;
    }

    // Build dynamic update query
    const allowedFields = [
      'template_name', 'liquid_content', 'settings_schema', 
      'default_settings', 'api_dependencies', 'is_active'
    ];

    const updateFields = [];
    const updateValues = [];
    let paramIndex = 3; // Start at 3 because $1 is id, $2 is tenant_id

    for (const [key, value] of Object.entries(templateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updateFields.push(`${key} = $${paramIndex}`);
        
        // Handle JSON fields
        if (['settings_schema', 'default_settings', 'api_dependencies'].includes(key)) {
          updateValues.push(JSON.stringify(value));
        } else {
          updateValues.push(value);
        }
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      return badRequestResponse('No valid fields provided for update');
    }

    // Add updated_at field
    updateFields.push(`updated_at = NOW()`);

    const updateQuery = `
      UPDATE liquid_templates 
      SET ${updateFields.join(', ')}
      WHERE id = $1 AND tenant_id = $2
      RETURNING id, updated_at
    `;

    const result = await query(updateQuery, [templateData.id, DEFAULT_TENANT_ID, ...updateValues]);

    if (result.rows.length === 0) {
      return badRequestResponse('Template not found or access denied');
    }

    return jsonResponse({
      success: true,
      message: 'Template updated successfully',
      data: {
        id: result.rows[0].id,
        updated_at: result.rows[0].updated_at
      }
    });
  } catch (error) {
    console.error('Update template error:', error);
    return internalServerErrorResponse('Failed to update template');
  }
}

// Delete template
export async function DELETE({ request }) {
  try {
    const { id } = await request.json();

    if (!id) {
      return badRequestResponse('Missing required field: id');
    }

    const result = await query(
      'DELETE FROM liquid_templates WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, DEFAULT_TENANT_ID]
    );

    if (result.rows.length === 0) {
      return badRequestResponse('Template not found or access denied');
    }

    return jsonResponse({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Delete template error:', error);
    return internalServerErrorResponse('Failed to delete template');
  }
}