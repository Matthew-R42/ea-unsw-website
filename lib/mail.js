// Shared helpers for the sign-up and cancel functions.
// Nothing is stored anywhere: a sign-up becomes two emails sent from the club's
// Gmail account (one to the club inbox, one confirmation to the person), and the cancel link carries its own
// signed details so no database is needed.

export const FORMS = {
  fellowship: {
    label: 'Intro Fellowship, Term 1 2027',
    clubSubject: 'Intro Fellowship sign-up, Term 1 2027',
    confirmSubject: "You're signed up for the EA UNSW Intro Fellowship",
    confirmLine: "You're signed up for the EA UNSW Intro Fellowship, Term 1 2027. We'll be in touch before Week 1 with your session day, time and room.",
    cancelledLine: 'Your sign-up for the EA UNSW Intro Fellowship has been cancelled.',
  },
  subcom: {
    label: 'Subcommittee, 2027',
    clubSubject: 'Subcommittee application, 2027',
    confirmSubject: 'We got your EA UNSW subcommittee application',
    confirmLine: "Thanks for applying to join the EA UNSW subcommittee. We've got your application and an exec will be in touch.",
    cancelledLine: 'Your application to the EA UNSW subcommittee has been withdrawn.',
  },
};

export function settings(env) {
  return {
    // Address of the Google Apps Script relay that lives in the club's Google
    // account (see mail-relay/Code.gs). Mail sent through it comes from the club's Gmail address.
    relay: env.MAIL_RELAY_URL,
    key: env.MAIL_RELAY_KEY,
    // Signs the cancel links. Uses the relay key unless a separate secret is set.
    secret: env.SIGNING_SECRET || env.MAIL_RELAY_KEY,
    club: env.CLUB_EMAIL || 'effectivealtruismunsw@gmail.com',
  };
}

export function ready(cfg) {
  return !!(cfg.relay && cfg.key && cfg.secret);
}

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

export function validEmail(s) {
  return typeof s === 'string' && s.length <= 200 && /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(s);
}

// Keep a single line of plain text: no line breaks (which could forge email headers) and no markup.
export function oneLine(s, max = 120) {
  return String(s || '').replace(/[\r\n\t<>]+/g, ' ').trim().slice(0, max);
}

const enc = new TextEncoder();
function b64url(bytes) {
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function unb64url(s) {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
async function hmac(secret, text) {
  const k = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(text))));
}

// A cancel token is "<details>.<signature>". Only someone holding the link we emailed can cancel.
export async function makeToken(secret, details) {
  const payload = b64url(enc.encode(JSON.stringify(details)));
  return payload + '.' + (await hmac(secret, payload));
}
export async function readToken(secret, token) {
  const [payload, sig] = String(token || '').split('.');
  if (!payload || !sig) return null;
  const good = await hmac(secret, payload);
  if (good.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < good.length; i++) diff |= good.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    const d = JSON.parse(new TextDecoder().decode(unb64url(payload)));
    const MAX_AGE = 1000 * 60 * 60 * 24 * 200; // links stop working after about 200 days
    if (!d || !FORMS[d.f] || !validEmail(d.e) || typeof d.t !== 'number' || Date.now() - d.t > MAX_AGE) return null;
    return d;
  } catch (e) {
    return null;
  }
}

// Send one plain-text email from the club's Gmail account, through the Apps Script relay.
// The relay answers {"ok":true} when Gmail accepted the message. If the script itself
// fails, Google returns an error page instead, so anything else counts as not sent.
export async function send(cfg, { to, subject, text, replyTo }) {
  try {
    const res = await fetch(cfg.relay, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: cfg.key, to, subject, text, replyTo }),
    });
    if (!res.ok) return false;
    const out = await res.json();
    return !!(out && out.ok === true);
  } catch (e) {
    return false;
  }
}

export function page(title, bodyHtml, status = 200) {
  const html = `<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${title} | EA UNSW</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#04343d;color:#0a2a30;font:17px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:520px;margin:24px;padding:32px;background:#f4f9f8;border:2px solid #0a2a30;border-radius:18px;box-shadow:6px 6px 0 #021f25}
h1{font-size:30px;line-height:1.1;margin:0 0 12px}p{margin:0 0 14px}
button,a.btn{display:inline-block;font:600 16px/1 inherit;padding:14px 22px;border-radius:999px;border:2px solid #0a2a30;background:#ffda1f;color:#0a2a30;text-decoration:none;cursor:pointer;box-shadow:3px 3px 0 #0a2a30}
a{color:#0a6c7e}</style></head><body><main>${bodyHtml}</main></body></html>`;
  return new Response(html, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
