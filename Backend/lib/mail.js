const nodemailer = require('nodemailer');

function isSmtpConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function createTransport() {
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function buildVerificationEmailContent({ name, verifyUrl, role }) {
  const roleLabel = role === 'entreprise' ? 'entreprise' : 'étudiant';
  const greeting = name ? `Bonjour ${name},` : 'Bonjour,';

  const text = [
    greeting,
    '',
    `Merci de vous être inscrit(e) sur StageFlow en tant que compte ${roleLabel}.`,
    'Pour activer votre compte, confirmez votre adresse email en ouvrant le lien ci-dessous :',
    '',
    verifyUrl,
    '',
    'Ce lien expire sous 24 heures.',
    'Si vous n\'avez pas créé de compte, ignorez cet email.',
    '',
    '— L\'équipe StageFlow',
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#0B1E3D">
      <h2 style="color:#00A8E0;margin-bottom:8px">StageFlow</h2>
      <p>${greeting}</p>
      <p>Merci de vous être inscrit(e) sur <strong>StageFlow</strong> en tant que compte <strong>${roleLabel}</strong>.</p>
      <p>Pour activer votre compte, confirmez votre adresse email :</p>
      <p style="margin:24px 0">
        <a href="${verifyUrl}" style="background:#00C2FF;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">
          Vérifier mon email
        </a>
      </p>
      <p style="font-size:13px;color:#4A5F7A">Ou copiez ce lien dans votre navigateur :<br><a href="${verifyUrl}">${verifyUrl}</a></p>
      <p style="font-size:12px;color:#8A9BB0;margin-top:24px">Ce lien expire sous 24 heures. Si vous n'avez pas créé de compte, ignorez cet email.</p>
    </div>`;

  return {
    subject: 'StageFlow — Confirmez votre adresse email',
    text,
    html,
  };
}

async function sendVerificationEmail({ to, name, verifyUrl, role }) {
  const content = buildVerificationEmailContent({ name, verifyUrl, role });

  if (!isSmtpConfigured()) {
    console.log('\n=== EMAIL DE VÉRIFICATION (SMTP non configuré) ===');
    console.log(`Destinataire : ${to}`);
    console.log(`Lien         : ${verifyUrl}`);
    console.log('================================================\n');
    return { sent: false, devMode: true, verifyUrl };
  }

  const transporter = createTransport();
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });

  return { sent: true };
}

module.exports = {
  isSmtpConfigured,
  sendVerificationEmail,
};
