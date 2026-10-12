import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { ErrorText, Field, Guard, Page, onSubmit } from '../ui';

interface Invite {
  id: string;
  token: string;
  label: string | null;
  used_at: string | null;
  revoked_at: string | null;
}

interface HomeData {
  invitations: { max: number; used: number; items: Invite[] };
  participant: { canInvite: boolean };
}

export default function Invites() {
  return (
    <Guard roles={['participant']}>
      <InvitesInner />
    </Guard>
  );
}

function InvitesInner() {
  const { token } = useAuth();
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  function load() {
    return api<HomeData>('/club/home', {}, token).then(setData);
  }
  useEffect(() => {
    load().catch((reason: Error) => setError(reason.message));
  }, [token]);

  async function create(event: FormEvent<HTMLFormElement>) {
    const form = new FormData(event.currentTarget);
    setError('');
    try {
      await api('/club/invitations', {
        method: 'POST',
        body: JSON.stringify({ label: form.get('label') }),
      }, token);
      event.currentTarget.reset();
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Inbjudan skapades inte.');
    }
  }

  async function revoke(id: string) {
    await api(`/club/invitations/${id}/revoke`, { method: 'POST' }, token);
    await load();
  }

  if (!data) return <Page title="Inbjudningar">{error || 'Hämtar…'}</Page>;
  if (!data.participant.canInvite) {
    return <Page title="Inbjudningar" lede="Gäster bjuder inte in vidare. Arrangören kan ge dig rätten om du ska ha den." />;
  }
  const openSlots = data.invitations.max - data.invitations.used;
  return (
    <Page title="Bjud in" lede={`Du kan ha ${data.invitations.max} gästinbjudningar. ${openSlots} lediga.`}>
      <form className="card" onSubmit={onSubmit(create)}>
        <Field label="Namn på gästen, bara som minneslapp"><input name="label" maxLength={80} /></Field>
        <ErrorText>{error}</ErrorText>
        <button className="btn" type="submit" disabled={openSlots <= 0}>Skapa länk</button>
      </form>
      <div className="list" style={{ marginTop: '1rem' }}>
        {data.invitations.items.map((invite) => {
          const link = `${window.location.origin}/inbjudan/${invite.token}`;
          return (
            <article className="card" key={invite.id}>
              <h2>{invite.label || 'Gäst'}</h2>
              <p className="meta">{invite.revoked_at ? 'Tillbakadragen' : invite.used_at ? 'Använd' : 'Inte använd'}</p>
              {!invite.revoked_at && <p>{link}</p>}
              {!invite.used_at && !invite.revoked_at && (
                <div className="actions">
                  <button className="btn small" type="button" onClick={() => navigator.clipboard.writeText(link).then(() => setCopied(invite.id))}>
                    {copied === invite.id ? 'Kopierad' : 'Kopiera'}
                  </button>
                  <button className="btn small ghost" type="button" onClick={() => revoke(invite.id)}>Dra tillbaka</button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </Page>
  );
}
