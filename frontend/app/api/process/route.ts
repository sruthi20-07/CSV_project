import { NextResponse, NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const apiHost = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const apiKeyHeader = request.headers.get('x-gemini-key') || '';

  let body: any;
  try {
    body = await request.json();
  } catch (err: any) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKeyHeader) {
      headers['x-gemini-key'] = apiKeyHeader;
    }

    const response = await fetch(`${apiHost}/api/process`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const result = await response.json();
    if (response.ok) {
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: result.error || 'Import processing failed' }, { status: response.status });
  } catch (error: any) {
    return NextResponse.json({ error: `Backend server unreachable: ${error.message}` }, { status: 502 });
  }
}
