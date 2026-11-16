// POST /api/signup
// Takes a fellowship sign-up or subcommittee application, emails the answers to
// the club inbox, and emails the person a confirmation with a link to cancel.
import { FORMS, settings, ready, json, validEmail, oneLine, makeToken, send } from '../../lib/mail.js';

export async function onRequestPost({ request, env }) {
  const cfg = settings(env);
  // Until the mail relay is set up in Cloudflare, say so; the page then falls back to the visitor's own email app.
  if (!ready(cfg)) return json({ ok: false, reason: 'not-configured' }, 503);

  // Only accept sign-ups sent from this site's own pages.
  const url = new URL(request.url);
  const origin = request.headers.get('origin');
  if (!origin || new URL(origin).host !== url.host) return json({ ok: false, reason: 'bad-origin' }, 403);

  let data;
  try { data = await request.json(); } catch (e) { return json({ ok: false, reason: 'bad-json' }, 400); }

  // "website" is a hidden field real people never fill in. Bots do.
  if (data.website) return json({ ok: true, confirm: true });

  const form = FORMS[data.form];
  const name = oneLine(data.name, 100);
  const email = String(data.email || '').trim();
  const answers = String(data.answers || '').slice(0, 8000);
  if (!form || !name || !validEmail(email) || !answers) return json({ ok: false, reason: 'invalid' }, 400);

  const token = await makeToken(cfg.secret, { f: data.form, e: email, n: name, t: Date.now() });
  const cancelUrl = url.origin + '/api/cancel?t=' + token;

  // 1. The record: the answers, sent to the club inbox. Replying goes to the person.
  const toClub = await send(cfg, {
    to: cfg.club,
    replyTo: email,
    subject: form.clubSubject + ': ' + name,
    text: answers + '\n\n--\nSent from the form on ' + url.host + '. A confirmation with a cancel link was emailed to ' + email + '.',
  });
  if (!toClub) return json({ ok: false, reason: 'send-failed' }, 502);

  // 2. The confirmation. Fixed wording only, so this cannot be used to send someone arbitrary text.
  const confirm = await send(cfg, {
    to: email,
    replyTo: cfg.club,
    subject: form.confirmSubject,
    text: [
      'Hi ' + name + ',',
      '',
      form.confirmLine,
      '',
      'Changed your mind? You can cancel any time:',
      cancelUrl,
      '',
      'Or just reply to this email and tell us.',
      '',
      "If you didn't fill in this form, ignore this email or use the link above and we'll remove it.",
      '',
      'EA UNSW',
      'https://' + url.host,
    ].join('\n'),
  });

  return json({ ok: true, confirm });
}
