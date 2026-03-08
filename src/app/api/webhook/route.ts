import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // MiniKit webhook handler - validates and processes frame events
    const { event, data } = body;

    switch (event) {
      case 'frame_added':
        // User added the frame/app
        console.log('[webhook] frame_added:', data);
        break;
      case 'frame_removed':
        // User removed the frame/app
        console.log('[webhook] frame_removed:', data);
        break;
      case 'notifications_enabled':
        console.log('[webhook] notifications_enabled:', data);
        break;
      case 'notifications_disabled':
        console.log('[webhook] notifications_disabled:', data);
        break;
      default:
        console.log('[webhook] unknown event:', event, data);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
