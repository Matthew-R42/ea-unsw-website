/* EA UNSW website: mail relay.
 *
 * This is NOT part of the website. It is a copy of the small script that lives
 * in the club's Google account at script.google.com, kept here so the next
 * exec can see it and set it up again. The website's sign-up forms hand their
 * emails to this script, and it sends them from the club's Gmail address, so
 * they also show up in the club's Sent folder.
 *
 * Set-up steps are in the README, under "Sign-up emails".
 *
 * The script only sends an email when the request carries the right key. The
 * key is not written here: it is saved in the script's own settings
 * (Project Settings, Script Properties, name RELAY_KEY).
 */

function doPost(e) {
  var out = { ok: false };
  try {
    var d = JSON.parse(e.postData.contents);
    var key = PropertiesService.getScriptProperties().getProperty('RELAY_KEY');
    var address = /^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;]+$/;
    if (!key || d.key !== key) {
      out.reason = 'bad-key';
    } else if (!address.test(String(d.to || '')) || !d.subject || !d.text) {
      out.reason = 'invalid';
    } else {
      var mail = {
        to: String(d.to),
        subject: String(d.subject).replace(/[\r\n]+/g, ' ').slice(0, 200),
        body: String(d.text).slice(0, 10000),
        name: 'EA UNSW'
      };
      if (d.replyTo && address.test(String(d.replyTo))) mail.replyTo = String(d.replyTo);
      MailApp.sendEmail(mail);
      out.ok = true;
    }
  } catch (err) {
    out.reason = 'error';
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

/* Opening the script's address in a browser just shows that it is alive. */
function doGet() {
  return ContentService.createTextOutput('EA UNSW mail relay is running.');
}
