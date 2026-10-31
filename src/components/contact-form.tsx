'use client';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, CheckCircle2, LoaderCircle } from 'lucide-react';
import { useStore } from './store-provider';
export function ContactForm() {
  const { data, action, busy } = useStore();
  const params = useSearchParams();
  const orderNumber = params.get('order');
  const [sent, setSent] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  useEffect(() => { if (data.user) { setName(data.user.name); setEmail(data.user.email); } }, [data.user]);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const result = await action('contact', Object.fromEntries(new FormData(event.currentTarget))); if (!result.error) setSent(true); }
  if (sent) return <div className="contact-success"><CheckCircle2 size={36} strokeWidth={1.4} /><h3>A little help is on its way.</h3><p>We’ve received your message. Our care team will get back to you at {email} within 1–2 business days.</p><button className="text-link mt-4" onClick={() => setSent(false)}>Send another message<ArrowRight size={14} /></button></div>;
  return <form className="contact-form" onSubmit={submit}><div className="form-grid"><label>Your name<input name="name" required minLength={2} maxLength={100} value={name} onChange={e => setName(e.target.value)} placeholder="Ananya Sharma" autoComplete="name" /></label><label>Email address<input name="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" /></label></div><label>A little about what you need<select aria-label="A little about what you need" name="subject" required defaultValue={orderNumber ? 'An order or delivery question' : 'A question about furniture'}><option>A question about furniture</option><option>An order or delivery question</option><option>A return or refund</option><option>Warranty & care</option><option>Becoming a seller</option><option>Newsletter unsubscribe</option><option>Something else</option></select></label><label>Your message<textarea name="message" required minLength={10} maxLength={2000} defaultValue={orderNumber ? `Hello! I have a question about my order ${orderNumber}.\n\n` : ''} placeholder="Tell us what’s on your mind. We’re here to help…" /></label><button className="btn btn-primary" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <>Send a little hello<ArrowRight size={16} /></>}</button></form>;
}
