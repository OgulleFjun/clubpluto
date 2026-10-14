import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { homeFor, useAuth } from '../auth';
import { ErrorText, Field, Page, onSubmit } from '../ui';

interface InviteInfo {
  valid: boolean;
  reason?: string;
  clubName?: string;
  inviterName?: string | null;
  grantsInvite?: boolean;
  membership?: string;
}

export default function Register() {
  const { token = '' } = useParams();
  const { acceptSession } = useAuth();
  const navigate = useNavigate();
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<InviteInfo>(`/invitations/${token}`).then(setInfo).catch((reason: Error) => setError(reason.message));
  }, [token]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    setError('');
    const body = new FormData(event.currentTarget);
    try {
      const data = await api<{ token: string; user: Parameters<typeof acceptSession>[1] }>(
        `/invitations/${token}`,
        { method: 'POST', body }
      );
      acceptSession(data.token, data.user);
      navigate(homeFor(data.user.role));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Registreringen misslyckades.');
    }
  }

  return (
    <Page
      title="Gå med"
      lede={
        info?.inviterName
          ? `Du är inbjuden av ${info.inviterName}.`
          : 'Inbjudan från arrangören.'
      }
    >
      {info && !info.valid && <p className="error">{info.reason}</p>}
      {info?.valid && (
        <form className="card" onSubmit={onSubmit(submit)}>
          <Field label="Namn"><input name="name" required maxLength={80} /></Field>
          <Field label="Alias"><input name="alias" required maxLength={40} /></Field>
          <Field label="E-post, bara för inloggning"><input name="email" type="email" required /></Field>
          <Field label="Lösenord, minst 8 tecken"><input name="password" type="password" minLength={8} required /></Field>
          <Field label="Porträtt">
            <input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required />
          </Field>
          <p className="meta">
            Bilden ska vara ett äkta porträtt av ditt ansikte, utan mask eller förklädnad. Den syns för inloggade deltagare och arrangörer, aldrig på den öppna sidan.
            {info.grantsInvite ? ' Den här inbjudan ger dig rätt att bjuda in två gäster.' : ''}
          </p>
          <ErrorText>{error}</ErrorText>
          <button className="btn" type="submit">Registrera mig</button>
        </form>
      )}
      {!info && <p>{error || 'Kontrollerar inbjudan…'}</p>}
    </Page>
  );
}
