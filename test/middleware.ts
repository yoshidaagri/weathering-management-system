import { NextRequest, NextResponse } from 'next/server';

/**
 * 認証が必要なルートのパターン
 */
const protectedPaths = [
  '/projects',
  '/measurements',
  '/monitoring', 
  '/reports',
  '/simulation',
  '/plan-actual',
];

/**
 * 認証不要のルート（開発用）
 */
const publicPaths = [
  '/mock-dashboard',
];

/**
 * 認証関連ページ（ログイン中ユーザーがアクセスした場合にリダイレクト）
 */
const authPaths = [
  '/auth/login',
  '/auth/signup',
  '/auth/verify',
  '/auth/forgot-password',
];

/**
 * ローカルストレージからトークン情報を確認する（サーバーサイドでは不可能）
 * そのため、最小限のチェックのみ実施し、クライアントサイドでの詳細チェックに委ねる
 */
function isAuthenticated(request: NextRequest): boolean {
  // Next.js middleware ではlocalStorageにアクセスできないため
  // セッション情報をCookieに保存する方式を採用
  const authCookie = request.cookies.get('auth-session');
  
  if (!authCookie) {
    return false;
  }

  try {
    const authData = JSON.parse(authCookie.value);
    const now = Date.now();
    
    // 有効期限チェック
    if (authData.expiresAt && authData.expiresAt < now) {
      return false;
    }
    
    // 必要なトークンの存在チェック
    return !!(authData.accessToken && authData.idToken);
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 静的ファイルは処理をスキップ
  if (pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next();
  }
  
  // 認証不要のルートは認証チェックをスキップ
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }
  
  const isUserAuthenticated = isAuthenticated(request);
  
  // 保護されたルートへのアクセス
  if (protectedPaths.some(path => pathname.startsWith(path))) {
    if (!isUserAuthenticated) {
      // 未認証の場合はログインページへリダイレクト
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }
  
  // 認証ページへの認証済みユーザーのアクセス
  if (authPaths.some(path => pathname.startsWith(path))) {
    if (isUserAuthenticated) {
      // 認証済みの場合はリダイレクトパラメータまたはデフォルトページへ
      const redirectUrl = request.nextUrl.searchParams.get('redirect') || '/projects';
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }
  }
  
  // ルートパス（/）の処理
  if (pathname === '/') {
    if (isUserAuthenticated) {
      return NextResponse.redirect(new URL('/projects', request.url));
    } else {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 以下のパスを除く全てのパスでmiddlewareを実行:
     * - api routes (api/*)
     * - _next/static (静的ファイル)
     * - _next/image (画像最適化)
     * - favicon.ico
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 