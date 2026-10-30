import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

const subjects: Record<string,string> = {
  bug: "Bug report",
  feedback: "Feedback / suggestion",
  support: "Account or notification help",
  privacy: "Privacy or data request",
  other: "General enquiry",
};
const escapeHtml = (s:string) => s.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c] || c));
const validEmail = (s:string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export async function POST(request:Request) {
  let input:Record<string,unknown>;
  try { input = await request.json(); }
  catch { return NextResponse.json({error:"Invalid request."},{status:400}); }
  if (!input || typeof input !== "object") return NextResponse.json({error:"Invalid request."},{status:400});
  if (input.website) return NextResponse.json({success:true});
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim() : "";
  const topic = typeof input.topic === "string" ? input.topic : "";
  const message = typeof input.message === "string" ? input.message.trim() : "";
  if (!name || name.length>100 || !validEmail(email) || email.length>254 || !subjects[topic] || message.length<10 || message.length>5000)
    return NextResponse.json({error:"Please complete all fields with a valid email and a message of at least 10 characters."},{status:400});
  const destination=process.env.CONTACT_TO_EMAIL;
  const from=process.env.EMAIL_FROM;
  if (!process.env.RESEND_API_KEY || !from || !destination)
    return NextResponse.json({error:"Contact email is not configured yet. Please try again later."},{status:503});
  const subject = "[My TV Tracker] "+subjects[topic];
  const html = '<div style="font-family:Arial,sans-serif;max-width:650px"><h2>'+escapeHtml(subject)+'</h2><p><strong>Name:</strong> '+escapeHtml(name)+'</p><p><strong>Email:</strong> '+escapeHtml(email)+'</p><p><strong>Category:</strong> '+escapeHtml(subjects[topic])+'</p><hr/><p style="white-space:pre-wrap">'+escapeHtml(message)+'</p></div>';
  try {
    const resend=new Resend(process.env.RESEND_API_KEY);
    const {error}=await resend.emails.send({
      from,
      to: destination.split(",").map(x=>x.trim()).filter(Boolean),
      replyTo: email,
      subject,
      html,
      text: "Name: "+name+"\nEmail: "+email+"\nCategory: "+subjects[topic]+"\n\n"+message,
    });
    if (error) {console.error("Contact email send failed",error);return NextResponse.json({error:"Message could not be delivered. Please try again later."},{status:502});}
    return NextResponse.json({success:true});
  } catch(error) {
    console.error("Contact form error",error);
    return NextResponse.json({error:"Message could not be delivered. Please try again later."},{status:502});
  }
}
