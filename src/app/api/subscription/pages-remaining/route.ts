import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { getPagesRemaining } from '@/lib/services/subscription-service';

export async function GET(request: NextRequest) {
  try {
    // 1. Get Authorization header and verify token
    const authorization = request.headers.get('Authorization');
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
    }
    const idToken = authorization.split('Bearer ')[1];

    // 2. Verify ID token using Firebase Admin SDK
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (error) {
      console.error('Error verifying Firebase ID token:', error);
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }
    const userId = decodedToken.uid;

    // 3. Call the server-side function to get pages remaining
    const pages = await getPagesRemaining(userId);

    // 4. Return the result
    return NextResponse.json({ pagesRemaining: pages });

  } catch (error) {
    console.error('Error fetching pages remaining:', error);
    // Avoid exposing internal errors directly
    return NextResponse.json(
      { error: 'Failed to fetch subscription details' },
      { status: 500 }
    );
  }
} 