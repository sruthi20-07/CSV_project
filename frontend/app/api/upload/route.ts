import { NextResponse, NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const apiHost = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const apiKeyHeader = request.headers.get('x-gemini-key') || '';

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (err: any) {
    return NextResponse.json({ error: 'Invalid form body' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  try {
    const backendFormData = new FormData();
    backendFormData.append('file', file);

    const headers: Record<string, string> = {};
    if (apiKeyHeader) {
      headers['x-gemini-key'] = apiKeyHeader;
    }

    const response = await fetch(`${apiHost}/api/upload`, {
      method: 'POST',
      headers,
      body: backendFormData,
    });

    const result = await response.json();
    if (response.ok) {
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: result.error || 'Upload processing failed' }, { status: response.status });
  } catch (error: any) {
    return NextResponse.json({ error: `Backend server unreachable: ${error.message}` }, { status: 502 });
  }
}
