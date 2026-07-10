import { NextResponse } from 'next/server';

export async function GET() {
  const apiHost = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000);
    const response = await fetch(`${apiHost}/api/health`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    }
  } catch (err) {}

  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'GrowEasy CRM AI CSV Importer NextJS Mock API Gateway (Offline Mode)',
  });
}
