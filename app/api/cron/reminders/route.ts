import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { connectToDatabase } from "../../../lib/mongodb";
import { Tournament } from "../../../models/Tournament";

// Vercel Cron hits this route every 30 minutes (see vercel.json).
// Sends reminder emails via Gmail SMTP using nodemailer.
// Requires GMAIL_USER=fninotify@gmail.com, GMAIL_PASS, and CRON_SECRET env vars.

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

async function sendEmail(to: string, subject: string, html: string) {
  try {
    await transporter.sendMail({
      from:    `"FnI Tournaments" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error(`Email failed for ${to}:`, err);
  }
}

function reminderHtml(username: string, title: string, scheduledAt: Date, label: string): string {
  const timeStr = scheduledAt.toUTCString();
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h2 style="color:#319795">FnI Tournament Reminder</h2>
      <p>Hi <strong>${username}</strong>,</p>
      <p>Your tournament <strong>${title}</strong> starts in approximately <strong>${label}</strong>.</p>
      <p><strong>Scheduled time:</strong> ${timeStr}</p>
      <p>Make sure you are ready in the lobby on time. No-shows forfeit their entry fee.</p>
      <p style="color:#718096;font-size:12px">You are receiving this because you joined this tournament on FnI.</p>
    </div>
  `;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();

  const now  = Date.now();
  let   sent = 0;

  // ── 24-hour reminder window ──────────────────────────────────────────────
  const h24Start = new Date(now + 23 * 60 * 60 * 1000);
  const h24End   = new Date(now + 25 * 60 * 60 * 1000);

  const tourneys24 = await Tournament.find({
    scheduledAt:         { $gte: h24Start, $lte: h24End },
    status:              { $in: ["Pending", "Active"] },
    "remindersSent.h24": false,
  });

  for (const t of tourneys24) {
    for (const p of t.participants) {
      await sendEmail(
        p.email,
        `⏰ Reminder: "${t.title}" starts in 24 hours`,
        reminderHtml(p.username, t.title, t.scheduledAt, "24 hours")
      );
      sent++;
    }
    t.remindersSent.h24 = true;
    await t.save();
  }

  // ── 30-minute reminder window ────────────────────────────────────────────
  const m30Start = new Date(now + 25 * 60 * 1000);
  const m30End   = new Date(now + 35 * 60 * 1000);

  const tourneysM30 = await Tournament.find({
    scheduledAt:         { $gte: m30Start, $lte: m30End },
    status:              { $in: ["Pending", "Active"] },
    "remindersSent.m30": false,
  });

  for (const t of tourneysM30) {
    for (const p of t.participants) {
      await sendEmail(
        p.email,
        `🚨 "${t.title}" starts in 30 minutes — join the lobby now!`,
        reminderHtml(p.username, t.title, t.scheduledAt, "30 minutes")
      );
      sent++;
    }
    t.remindersSent.m30 = true;
    await t.save();
  }

  return NextResponse.json({ ok: true, emailsSent: sent });
}
