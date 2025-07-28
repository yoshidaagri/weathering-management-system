import { type ClassValue, clsx } from "clsx"

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

// 日付フォーマット
export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

// 相対時間フォーマット
export function formatRelativeTime(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return '数秒前';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}分前`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}時間前`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}日前`;
  } else {
    return formatDate(d);
  }
}

// 数値フォーマット
export function formatNumber(num: number): string {
  return num.toLocaleString('ja-JP');
}

// 文字列の切り詰め
export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}

// メールアドレスバリデーション
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// 電話番号フォーマット
export function formatPhoneNumber(phone: string): string {
  // 数字のみ抽出
  const cleaned = phone.replace(/\D/g, '');
  
  // 日本の電話番号形式にフォーマット
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  } else if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
  }
  
  return phone;
}

// 産業分類の日本語名
export const industryLabels: Record<string, string> = {
  'mining': '鉱業・採石業',
  'construction': '建設業',
  'manufacturing': '製造業',
  'energy': 'エネルギー業',
  'chemicals': '化学工業',
  'steel': '鉄鋼業',
  'environment': '環境・リサイクル業',
  'other': 'その他',
};

// ステータスの日本語名
export const statusLabels: Record<string, string> = {
  'active': 'アクティブ',
  'inactive': '非アクティブ',
};

// ステータスの色
export const statusColors: Record<string, string> = {
  'active': 'bg-green-100 text-green-800',
  'inactive': 'bg-gray-100 text-gray-800',
};