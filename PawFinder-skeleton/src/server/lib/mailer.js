/**
 * Sends the password reset email. There is no email provider yet, so the default
 * "mailer" prints the message to the server console, which is enough for
 * development and the course demo. To send real email later, pass a
 * `sendMail({ to, subject, text })` function to createApp() instead.
 */
export function consoleMailer({ to, subject, text }) {
  console.log(`\n--- Email (not actually sent) ---\nTo: ${to}\nSubject: ${subject}\n\n${text}\n---------------------------------\n`);
}
