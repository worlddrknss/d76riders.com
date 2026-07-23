-- Starter privacy policy, seeded into the admin-editable policy system so it can
-- be refined at /admin/policies rather than living in code. required=false: it's
-- informational and must not gate the app behind an acknowledgment. Idempotent
-- on the unique slug.
INSERT INTO "Policy" ("id", "slug", "title", "summary", "bodyHtml", "type", "version", "required", "active", "publishedAt", "createdAt", "updatedAt")
VALUES (
  'd76-policy-privacy',
  'privacy',
  'Privacy Policy',
  'What District 76 collects, why, and the rights you have over your data. A starting template — review before relying on it.',
  '<p><em>This is a starting template. Have it reviewed before treating it as legal advice.</em></p>
<h2>Who we are</h2>
<p>District 76 Riders ("we") runs this motorcycle community platform. For any privacy question, contact <a href="mailto:d76riders@gmail.com">d76riders@gmail.com</a>.</p>
<h2>What we collect</h2>
<ul>
<li><strong>Account details</strong> you give us: name, username, email, password (stored only as a hash), and your general location and timezone, which we use to sort rides and roads near you.</li>
<li><strong>Content you create</strong>: journal posts, photos, events, roads, marketplace listings, comments, and messages to other riders.</li>
<li><strong>Emergency card</strong> (optional): the emergency contacts and medical details you choose to add are encrypted at rest and shown only to whoever scans your card.</li>
<li><strong>Technical data</strong>: a session cookie that keeps you signed in, and — only if you allow it — analytics about how the site is used.</li>
</ul>
<h2>Why we use it (legal basis)</h2>
<ul>
<li>To run your account and show you the community — necessary to provide the service you signed up for.</li>
<li>To send you notifications you have not turned off — your settings control these, and you can opt out of any category.</li>
<li>Analytics — only with your consent, which you can withdraw at any time from the "Cookie settings" link in the footer.</li>
</ul>
<h2>Who we share it with</h2>
<p>We do not sell your data. We use a small set of service providers to run the platform:</p>
<ul>
<li><strong>Cloudflare</strong> — delivers and protects the site.</li>
<li><strong>Self-hosted storage (MinIO)</strong> — stores your uploaded images, on our own infrastructure.</li>
<li><strong>Gmail (Google)</strong> — sends transactional email such as verification and notifications.</li>
<li><strong>Open-Meteo</strong> and <strong>MapTiler</strong> — provide weather and maps. We send them a location, never your identity.</li>
<li><strong>Google Analytics</strong> — usage measurement, loaded only after you consent.</li>
</ul>
<h2>How long we keep it</h2>
<p>We keep your data while your account is active. When you delete your account, your profile and the content tied to it are permanently removed from our database; backups age out on our normal rotation.</p>
<h2>Your rights</h2>
<ul>
<li><strong>Access &amp; portability</strong> — download a copy of your data from Settings.</li>
<li><strong>Rectification</strong> — edit your profile and content at any time.</li>
<li><strong>Erasure</strong> — delete your account from Settings, which removes your data.</li>
<li><strong>Withdraw consent</strong> — change your cookie choice from the footer, or your notification preferences in Settings.</li>
</ul>
<p>If you are in the EU or UK and believe we have mishandled your data, you have the right to complain to your local data protection authority.</p>
<h2>Children</h2>
<p>This platform is not intended for anyone under 16. Do not create an account if you are younger than that.</p>
<h2>Changes</h2>
<p>We will update this policy as the platform changes, and note the date here when we do.</p>',
  'PRIVACY',
  '1',
  false,
  true,
  now(),
  now(),
  now()
)
ON CONFLICT ("slug") DO NOTHING;
