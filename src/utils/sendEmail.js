import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.USER_EMAIL,
    pass: process.env.USER_PASS,
  },
});

const sendEmail = ({ to, subject, html }) => {
  return transporter.sendMail({
    from: process.env.USER_EMAIL,
    to,
    subject,
    html,
  });
};

export default sendEmail;
