import nodemailer from "nodemailer";

import { serverSettings } from "./settings";

type Mail = { to: string; subject: string; text: string };

/**
 * Send through SMTP when SMTP_HOST is set. Without it, development prints the
 * message to the console and production logs that nothing was delivered.
 */
export async function sendMail(mail: Mail): Promise<void> {
  const settings = serverSettings();
  if (!settings.smtpHost) {
    if (settings.production) {
      console.warn(`SMTP_HOST is not set, so the email "${mail.subject}" was not delivered.`);
    } else {
      console.info(`\n--- Email (not sent: SMTP_HOST is not set) ---\nTo: ${mail.to}\nSubject: ${mail.subject}\n\n${mail.text}\n---\n`);
    }
    return;
  }
  const transport = nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpSecure,
    auth: settings.smtpUser ? { user: settings.smtpUser, pass: settings.smtpPassword } : undefined,
  });
  await transport.sendMail({ from: settings.mailFrom, to: mail.to, subject: mail.subject, text: mail.text });
}
