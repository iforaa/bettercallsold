// Response utilities to match Go backend format

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

export function successResponse(message, data = null) {
  const response = {
    message,
    timestamp: new Date().toISOString()
  };
  
  if (data !== null) {
    response.data = data;
  }
  
  return jsonResponse(response);
}

export function errorResponse(message, status = 500) {
  return jsonResponse({
    error: message,
    timestamp: new Date().toISOString()
  }, status);
}

export function badRequestResponse(message = 'Bad Request') {
  return errorResponse(message, 400);
}

export function notFoundResponse(message = 'Not Found') {
  return errorResponse(message, 404);
}

export function internalServerErrorResponse(message = 'Internal Server Error') {
  return errorResponse(message, 500);
}