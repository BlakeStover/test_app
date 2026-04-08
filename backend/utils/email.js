const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendTicketNotification = async (ticket) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER,
    subject: `New Ticket Submitted: ${ticket.title}`,
    html: `
      <h2>New Service Request</h2>
      <p><strong>Title:</strong> ${ticket.title}</p>
      <p><strong>Description:</strong> ${ticket.description}</p>
      <p><strong>Category:</strong> ${ticket.category}</p>
      <p><strong>Priority:</strong> ${ticket.priority}</p>
      <p><strong>Submitted:</strong> ${new Date(ticket.created_at).toLocaleString()}</p>
      <br/>
      <p>Login to the dispatcher dashboard to manage this request.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Notification email sent');
  } catch (err) {
    console.error('Email error:', err);
  }
};

const sendPasswordResetEmail = async (email, token) => {
  const resetLink = `http://localhost:5173/reset-password?token=${token}`;
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset Request',
    html: `
      <h2>Password Reset</h2>
      <p>You requested a password reset for your Campus Ticket System account.</p>
      <p>Click the link below to reset your password. This link expires in 1 hour.</p>
      <a href="${resetLink}" style="background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;">Reset Password</a>
      <p style="margin-top:16px;color:#666;">If you didn't request this, you can safely ignore this email.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Password reset email sent');
  } catch (err) {
    console.error('Email error:', err);
  }
};

const sendStatusUpdateEmail = async (submitter, ticket, newStatus) => {
  const statusLabel = {
    in_progress: 'In Progress',
    resolved: 'Resolved',
    closed: 'Closed',
  };

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: submitter.email,
    subject: `Your request has been updated: ${ticket.title}`,
    html: `
      <h2>Request Status Update</h2>
      <p>Hi ${submitter.name},</p>
      <p>Your request <strong>#${ticket.id} — ${ticket.title}</strong> has been updated.</p>
      <p><strong>New status:</strong> ${statusLabel[newStatus] || newStatus}</p>
      <br/>
      <p>Log in to the Campus Ticket System to view the full details and any notes from the team.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Status update email sent');
  } catch (err) {
    console.error('Email error:', err);
  }
};

const sendDispatcherReplyEmail = async (studentEmail, studentName, ticketId, noteContent) => {
  const ticketLink = `http://localhost:5173/ticket?id=${ticketId}`;
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: studentEmail,
    subject: `A dispatcher replied to your request #${ticketId}`,
    html: `
      <h2>New Reply on Your Request</h2>
      <p>Hi ${studentName},</p>
      <p>A dispatcher has replied to your request <strong>#${ticketId}</strong>:</p>
      <blockquote style="border-left:4px solid #2563eb;margin:16px 0;padding:12px 16px;background:#f0f4ff;border-radius:4px;color:#1e293b;">
        ${noteContent.replace(/\n/g, '<br/>')}
      </blockquote>
      <a href="${ticketLink}" style="background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:8px;">View your request</a>
      <p style="margin-top:16px;color:#666;">You can reply directly in the app.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Dispatcher reply email sent');
  } catch (err) {
    console.error('Email error:', err);
  }
};

module.exports = { sendTicketNotification, sendPasswordResetEmail, sendStatusUpdateEmail, sendDispatcherReplyEmail };