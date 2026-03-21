import {NextResponse} from "next/server";
import {EmailParams, MailerSend, Recipient, Sender} from "mailersend";
import {getServerSession} from "next-auth/next";
import {authOptions} from "@lib/auth";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const type = formData.get("type")?.toString() || "Bug Report";
    const description = formData.get("description")?.toString() || "No description provided";
    const screenshot = formData.get("screenshot") as File | null;

    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email ?? "unknown";

    const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024; // 5 MB
    const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

    if (screenshot) {
      if (screenshot.size > MAX_SCREENSHOT_BYTES) {
        return NextResponse.json({error: "Screenshot must be under 5 MB"}, {status: 400});
      }
      if (!ALLOWED_MIME_TYPES.includes(screenshot.type)) {
        return NextResponse.json({error: "Screenshot must be a JPEG, PNG, GIF, or WebP image"}, {status: 400});
      }
    }

    const attachments = [];

    if (screenshot) {
      const arrayBuffer = await screenshot.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");

      attachments.push({
        content: base64,
        filename: screenshot.name,
        type: screenshot.type,
        disposition: "attachment"
      });
    }

    const mailerSend = new MailerSend({
      apiKey: process.env.MAILERSEND_API_KEY!,
    });

    const now = new Date();
    const date = `${now.getDate().toString().padStart(2,'0')}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getFullYear()}`;
    const time = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;

    const emailBody = `
========== ${type.toUpperCase()} ==========
Date: ${date}
Time: ${time}

User Email: ${userEmail}

--- Description ---
${description}

--- Screenshot ---
${screenshot ? screenshot.name : "No screenshot attached"}
================================
`;

    const emailParams = new EmailParams()
      .setFrom(new Sender(process.env.MAILERSEND_FROM!, "Feedback"))
      .setTo([new Recipient(process.env.MAILERSEND_TO!, "Developer")])
      .setSubject(`New ${type}`)
      .setText(emailBody)
      .setAttachments(attachments);

    await mailerSend.email.send(emailParams);

    return NextResponse.json({success: true});
  } catch (err) {
    console.error("Error sending feedback:", err);
    return NextResponse.json({error: "Failed to send feedback"}, {status: 500});
  }
}
