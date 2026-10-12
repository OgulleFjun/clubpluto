import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { homeFor, useAuth } from '../auth';
import { ErrorText, Field, Page, onSubmit } from '../ui';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    const data = new FormData(event.currentTarget);
    setError('');
    try {
      const user = await login(String(data.get('email') || ''), String(data.get('password') || ''));
      navigate(homeFor(user.role));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Inloggningen misslyckades.');
    }
  }

  return (
    <Page title="Logga in" lede="Deltagare, spelledare och arrangörer använder samma dörr.">
      <form className="card" onSubmit={onSubmit(submit)}>
        <Field label="E-post"><input name="email" type="email" autoComplete="username" required /></Field>
        <Field label="Lösenord"><input name="password" type="password" autoComplete="current-password" required /></Field>
        <ErrorText>{error}</ErrorText>
        <button className="btn" type="submit">Öppna</button>
      </form>
      <p className="meta">Har du en inbjudningslänk öppnar du den direkt. Den ser ut som /inbjudan/…</p>
      <p><Link to="/">Tillbaka till klubben</Link></p>
    </Page>
  );
}
