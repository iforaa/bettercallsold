import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';

export async function GET({ url }) {
  try {
    const baseUrl = url.searchParams.get('baseUrl') || 'https://api.commentsold.com/api/2.0/divas';
    const testUrl = `${baseUrl}/collections`;
    
    console.log('Testing connectivity to:', testUrl);
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'CommentSold-SvelteKit-Test/1.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });
    
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    
    let responseData;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }
    
    console.log(`Connectivity test result: ${response.status} ${response.statusText}`);
    
    return jsonResponse({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      data: responseData,
      url: testUrl,
      dataType: Array.isArray(responseData) ? 'array' : typeof responseData,
      dataLength: Array.isArray(responseData) ? responseData.length : 'N/A'
    });
  } catch (error) {
    console.error('Connectivity test error:', error);
    return internalServerErrorResponse(`Connectivity test failed: ${error.message}`);
  }
}