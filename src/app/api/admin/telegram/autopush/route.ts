import { NextRequest, NextResponse } from 'next/server';
import { runAutoPushCheck } from '@/lib/autoPushService';

export async function POST(request: NextRequest) {
  try {
    const result = await runAutoPushCheck();
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, pushed: false, error: err.message || 'Auto-push error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const result = await runAutoPushCheck();
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, pushed: false, error: err.message || 'Auto-push error' },
      { status: 500 }
    );
  }
}
