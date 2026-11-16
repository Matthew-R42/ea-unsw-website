// GET  /api/cancel?t=...  shows a "cancel this?" page with one button.
// POST /api/cancel?t=...  does the cancelling: tells the club inbox and confirms to the person.
// The button step matters: email apps often open links on their own to scan
// them, and that must not cancel anything.
import { FORMS, settings, ready, readToken, send, page, esc } from '../../lib/mail.js';

async function load(request, env) {
  const cfg = settings(env);
  if (!ready(cfg)) return { cfg, error: page('Not available', '<h1>Cancelling by link is not switched on yet</h1><p>Please reply to your confirmation email, or write to <a href="mailto:' + esc(cfg.club) + '">' + esc(cfg.club) + '</a>, and we will sort it out.</p>', 503) };
  const d = await readToken(cfg.secret, new URL(request.url).searchParams.get('t'));
  if (!d) return { cfg, error: page('Link not valid', '<h1>That link has expired or is not valid</h1><p>Please reply to your confirmation email, or write to <a href="mailto:' + esc(cfg.club) + '">' + esc(cfg.club) + '</a>, and we will cancel it for you.</p>', 400) };
  return { cfg, d, form: FORMS[d.f] };
}

export async function onRequestGet({ request, env }) {
  const { error, d, form } = await load(request, env);
  if (error) return error;
  return page('Cancel', '<h1>Cancel this?</h1><p><b>' + esc(form.label) + '</b><br>' + esc(d.n) + ', ' + esc(d.e) + '</p><form method="post"><button type="submit">Yes, cancel it</button></form><p style="margin-top:16px">Changed your mind? Just close this page.</p>');
}

export async function onRequestPost({ request, env }) {
  const { cfg, error, d, form } = await load(request, env);
  if (error) return error;
  const told = await send(cfg, {
    to: cfg.club,
    replyTo: d.e,
    subject: 'CANCELLED: ' + form.clubSubject + ': ' + d.n,
    text: d.n + ' (' + d.e + ') cancelled using the link in their confirmation email.\n\nForm: ' + form.label,
  });
  if (!told) return page('Something went wrong', '<h1>That did not go through</h1><p>Please reply to your confirmation email, or write to <a href="mailto:' + esc(cfg.club) + '">' + esc(cfg.club) + '</a>, and we will cancel it for you.</p>', 502);
  await send(cfg, {
    to: d.e,
    replyTo: cfg.club,
    subject: 'Cancelled: ' + form.label,
    text: 'Hi ' + d.n + ',\n\n' + form.cancelledLine + ' No hard feelings.\n\nIf this was a mistake, reply to this email or sign up again on our site.\n\nEA UNSW',
  });
  return page('Cancelled', '<h1>Done. It is cancelled.</h1><p>' + esc(form.cancelledLine) + ' We have emailed you a note to confirm.</p><p><a class="btn" href="/">Back to EA UNSW</a></p>');
}
