import { Injectable } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';

import { AppConfig } from '../../../config/app-config.service';

export interface GoogleIdTokenClaims {
  sub: string;
  email: string | undefined;
  emailVerified: boolean;
}

/**
 * Verifies a Google ID token: Google's signature, expiry, issuer, and an audience of
 * GOOGLE_WEB_CLIENT_ID (Android/web-issued) or GOOGLE_IOS_CLIENT_ID (iOS-issued). Returns null
 * when any check fails. Replaced by a stub in integration tests.
 */
@Injectable()
export class GoogleIdTokenVerifier {
  private readonly client = new OAuth2Client();

  constructor(private readonly config: AppConfig) {}

  async verify(idToken: string): Promise<GoogleIdTokenClaims | null> {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.config.googleAudiences,
      });
      const payload = ticket.getPayload();
      if (!payload?.sub) return null;
      return {
        sub: payload.sub,
        email: payload.email,
        emailVerified: payload.email_verified === true,
      };
    } catch {
      return null;
    }
  }
}
