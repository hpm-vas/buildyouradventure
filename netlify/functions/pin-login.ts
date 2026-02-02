import type { Handler, HandlerEvent } from '@netlify/functions';
import jwt from 'jsonwebtoken';

interface AuthResponse {
  success: boolean;
  user?: {
    id: string;
    role: 'player' | 'reader' | 'admin';
    name: string | null;
  };
  error?: string;
}

interface PinLoginRequest {
  pin: string;
}

const handler: Handler = async (event: HandlerEvent) => {
  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Only POST allowed
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Check environment variables
  const supabaseUrl = process.env['SUPABASE_URL'];
  const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  const jwtSecret = process.env['JWT_SECRET'];

  if (!supabaseUrl || !supabaseKey || !jwtSecret) {
    console.error('Missing environment variables');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server configuration error' })
    };
  }

  // Parse request body
  let body: PinLoginRequest;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid JSON' })
    };
  }

  const { pin } = body;

  // Validate PIN format
  if (!pin || !/^\d{6}$/.test(pin)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'PIN must be exactly 6 digits' })
    };
  }

  try {
    // Call Supabase RPC function
    const rpcUrl = `${supabaseUrl}/rest/v1/rpc/auth_with_pin`;
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ p_pin: pin })
    });

    if (!response.ok) {
      console.error('Supabase RPC error:', response.status, await response.text());
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Authentication service error' })
      };
    }

    const authResult: AuthResponse = await response.json();

    if (!authResult.success || !authResult.user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: authResult.error || 'Invalid PIN' })
      };
    }

    // Generate JWT
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = 7 * 24 * 60 * 60; // 7 days

    const token = jwt.sign(
      {
        sub: authResult.user.id,
        role: authResult.user.role,
        name: authResult.user.name,
        iat: now,
        exp: now + expiresIn
      },
      jwtSecret,
      { algorithm: 'HS256' }
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        token,
        user: authResult.user,
        expiresAt: (now + expiresIn) * 1000 // milliseconds for JS Date
      })
    };

  } catch (error) {
    console.error('PIN login error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

export { handler };
