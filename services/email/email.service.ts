type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

export const emailService = {
  async send(input: SendEmailInput) {
    const provider = process.env.EMAIL_PROVIDER || "mock";

    if (provider === "resend" && process.env.RESEND_API_KEY) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "Obmapay <no-reply@obmapay.com>",
          to: input.to,
          subject: input.subject,
          html: input.html
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Email could not be sent");
      }
    }

    return { provider, queued: true };
  }
};
