import 'server-only';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { magicLink } from 'better-auth/plugins';
import { prisma } from '@mercek/db';
import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

async function sendMagicLinkEmail(email: string, url: string): Promise<void> {
  if (!resend) {
    // Dev fallback: no Resend key configured → log the link so local flows work.
    console.info(`[auth] Magic link for ${email}: ${url}`);
    return;
  }
  await resend.emails.send({
    from: 'Mercek <onboarding@resend.dev>',
    to: email,
    subject: 'Mercek — giriş bağlantınız',
    text: `Giriş yapmak için: ${url}`,
  });
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendMagicLinkEmail(email, url);
      },
    }),
  ],
});
