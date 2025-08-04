import { jsonResponse } from '$lib/response.js';

export async function GET() {
  return jsonResponse({
    message: 'pong',
    timestamp: new Date().toISOString(),
    status: 'ok'
  });
}