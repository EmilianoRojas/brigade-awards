import { AuthUser } from '../types';

export function decodeJwt(token: string): AuthUser | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    const parsed = JSON.parse(jsonPayload);
    
    // Supabase JWTs store user ID in `sub` and other claims in `user_metadata` or at the root
    return {
      id: parsed.sub,
      email: parsed.email,
      partner_id: parsed.user_metadata?.partner_id || null,
      user_group: parsed.user_metadata?.user_group || null,
      gender: parsed.user_metadata?.gender || null,
      is_partnered: parsed.user_metadata?.is_partnered || false,
    };

  } catch (error) {
    console.error("Failed to decode JWT:", error);
    return null;
  }
}