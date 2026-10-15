import { NextResponse } from 'next/server';
import { getBroadcastLogs } from '@/lib/configService';

export async function GET() {
  try {
    const logs = await getBroadcastLogs(50);
    return NextResponse.json({
      success: true,
      logs,
      broadcasts: logs,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch broadcast logs' },
      { status: 500 }
    );
  }
}
