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

module.exports = { sendTicketNotification };