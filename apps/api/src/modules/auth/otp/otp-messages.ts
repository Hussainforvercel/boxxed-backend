import type { MailMessage } from '../../../infra/mail/mail.service';

/** Server-side copy for OTP delivery. Plain text + minimal HTML; no template engine (docs/06 §11). */
export function otpSmsText(code: string, ttlMinutes: number): string {
  return `${code} is your Boxxed code. It expires in ${ttlMinutes} min. Don't share it.`;
}

export function otpEmail(to: string, code: string, ttlMinutes: number): MailMessage {
  return {
    to,
    subject: `${code} is your Boxxed code`,
    text: [
      `Your Boxxed sign-in code is ${code}.`,
      `It expires in ${ttlMinutes} minutes. If you didn't ask for it, you can ignore this email.`,
    ].join('\n\n'),
    html: [
      '<p>Your Boxxed sign-in code is</p>',
      `<p style="font-size:28px;font-weight:700;letter-spacing:6px;font-family:monospace">${code}</p>`,
      `<p>It expires in ${ttlMinutes} minutes. If you didn't ask for it, you can ignore this email.</p>`,
    ].join('\n'),
  };
}
