'use client';

import { useCallback, useEffect, useState } from 'react';
import { LoaderCircle, Link2, Search, Unlink } from 'lucide-react';

type ManagedSeller = { id: string; name: string; slug: string; city: string; userId: string | null; userName: string | null; userEmail: string | null };
type Account = { id: string; name: string; email: string };

export function AdminSellerManagement() {
  const [sellers, setSellers] = useState<ManagedSeller[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async (q = query) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/sellers${q.trim().length >= 2 ? `?q=${encodeURIComponent(q.trim())}` : ''}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load seller accounts.');
      setSellers(data.sellers);
      setAccounts(data.accounts);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load seller accounts.'); }
    finally { setLoading(false); }
  }, [query]);

  useEffect(() => { queueMicrotask(() => { void load(''); }); }, [load]);

  async function save(sellerId: string, action: 'link' | 'unlink', userId?: string) {
    setBusy(true); setMessage(''); setError('');
    try {
      const response = await fetch('/api/admin/sellers', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, sellerId, userId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update seller account.');
      setMessage(data.message);
      setSelected(current => { const next = { ...current }; delete next[sellerId]; return next; });
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update seller account.'); }
    finally { setBusy(false); }
  }

  return <main id="main-content" className="container page-spacer">
    <p className="eyebrow">ADMINISTRATION</p><h1 className="page-title mt-3">Live-catalog seller accounts</h1>
    <p className="page-subtitle">Link each imported seller to an existing user account after independently verifying ownership.</p>
    <div className="admin-seller-search"><label htmlFor="account-search">Find an existing account</label><div><Search size={17} /><input id="account-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by name or email" /><button className="btn btn-outline btn-small" onClick={() => void load(query)}>Search accounts</button></div><small>Only account names and email addresses are shown. No password or session details are exposed.</small></div>
    {message && <p role="status" className="inline-notice">{message}</p>}{error && <p role="alert" className="admin-error">{error}</p>}
    {loading ? <p className="admin-loading"><LoaderCircle className="spin" size={18} />Loading seller mappings…</p> : <div className="admin-seller-list">
      {sellers.map(seller => <section className="admin-seller-row" key={seller.id}>
        <div><h2>{seller.name}</h2><p>{seller.city} · {seller.slug}</p></div>
        <div className="admin-seller-mapping"><span className="tag">{seller.userId ? 'Linked' : 'Unlinked'}</span>{seller.userId && <><strong>{seller.userName || 'Account name unavailable'}</strong><small>{seller.userEmail || 'Account email unavailable'}</small></>}<label className="sr-only" htmlFor={`account-${seller.id}`}>{seller.userId ? `Change account for ${seller.name}` : `Choose account for ${seller.name}`}</label><select id={`account-${seller.id}`} value={selected[seller.id] || ''} onChange={event => setSelected(current => ({ ...current, [seller.id]: event.target.value }))}><option value="">{seller.userId ? 'Choose another account' : 'Choose a matching account'}</option>{accounts.map(account => <option key={account.id} value={account.id}>{account.name} · {account.email}</option>)}</select><button className="btn btn-primary btn-small" disabled={busy || !selected[seller.id] || selected[seller.id] === seller.userId} onClick={() => void save(seller.id, 'link', selected[seller.id])}><Link2 size={14} />{seller.userId ? 'Change link' : 'Link account'}</button>{seller.userId && <button className="btn btn-outline btn-small" disabled={busy} onClick={() => void save(seller.id, 'unlink')}><Unlink size={14} />Unlink</button>}</div>
      </section>)}
      {!sellers.length && <p>No live-catalog sellers were found.</p>}
    </div>}
  </main>;
}
