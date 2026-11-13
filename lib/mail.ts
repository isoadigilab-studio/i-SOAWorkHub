/** Transactional email through Brevo's HTTP API (works on Cloudflare Workers; free tier available). */
export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

export async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  const key = process.env.BREVO_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!key || !from) return false;
  try {
    const r = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": key, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { name: "i-SOA WorkHub", email: from },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });
    return r.ok;
  } catch {
    return false;
  }
}
