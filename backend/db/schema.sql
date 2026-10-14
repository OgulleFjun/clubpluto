-- Club Pluto / Svartklubben
-- Schemat körs om vid varje deploy och ska därför vara idempotent.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS event_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  club_name text NOT NULL DEFAULT 'Club Pluto',
  tagline text NOT NULL DEFAULT 'Svartklubben',
  event_starts_at timestamptz NOT NULL DEFAULT '2026-11-01 18:30:00+01',
  location text NOT NULL DEFAULT 'Källaren, Folkets hus, Sala',
  public_intro text NOT NULL DEFAULT '',
  rules_text text NOT NULL DEFAULT '',
  door_password_hash text,
  registration_open boolean NOT NULL DEFAULT true,
  identity_open boolean NOT NULL DEFAULT false,
  vampire_conversions_open boolean NOT NULL DEFAULT false,
  results_revealed boolean NOT NULL DEFAULT false,
  use_aliases boolean NOT NULL DEFAULT true,
  first_vampire_gets_bonus boolean NOT NULL DEFAULT false,
  tie_break text NOT NULL DEFAULT 'shared' CHECK (tie_break IN ('shared', 'earliest', 'manual')),
  competition_closed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'doorman', 'gamemaster', 'participant')),
  active boolean NOT NULL DEFAULT true,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS display_name text;

CREATE TABLE IF NOT EXISTS participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid UNIQUE REFERENCES accounts(id) ON DELETE SET NULL,
  name text NOT NULL,
  alias text,
  email text,
  photo_path text,
  photo_token text NOT NULL UNIQUE,
  name_token text NOT NULL UNIQUE,
  door_code text NOT NULL UNIQUE,
  membership text NOT NULL DEFAULT 'guest' CHECK (membership IN ('sus', 'sas', 'guest', 'staff')),
  can_invite boolean NOT NULL DEFAULT false,
  invited_by_id uuid REFERENCES participants(id) ON DELETE SET NULL,
  checked_in_at timestamptz,
  base_chips_issued boolean NOT NULL DEFAULT false,
  base_chips integer NOT NULL DEFAULT 0,
  is_vampire boolean NOT NULL DEFAULT false,
  is_first boolean NOT NULL DEFAULT false,
  vampire_at timestamptz,
  turned_by_id uuid REFERENCES participants(id) ON DELETE SET NULL,
  vampire_bonus_granted boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS participants_name_idx ON participants (lower(name));

CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  inviter_id uuid REFERENCES participants(id) ON DELETE SET NULL,
  created_by_account uuid REFERENCES accounts(id) ON DELETE SET NULL,
  label text,
  kind text NOT NULL DEFAULT 'guest' CHECK (kind IN ('guest', 'staff')),
  grants_invite boolean NOT NULL DEFAULT false,
  membership text NOT NULL DEFAULT 'guest' CHECK (membership IN ('sus', 'sas', 'guest', 'staff')),
  used_by_id uuid REFERENCES participants(id) ON DELETE SET NULL,
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS identity_guesses (
  guesser_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  photo_participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  guessed_participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (guesser_id, photo_participant_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS identity_guesses_one_name
  ON identity_guesses (guesser_id, guessed_participant_id);

CREATE TABLE IF NOT EXISTS vampire_guesses (
  guesser_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  suspects boolean NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (guesser_id, subject_id)
);

CREATE TABLE IF NOT EXISTS games (
  key text PRIMARY KEY,
  name text NOT NULL,
  summary text NOT NULL DEFAULT '',
  rules text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS gamemaster_games (
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  game_key text NOT NULL REFERENCES games(key) ON DELETE CASCADE,
  PRIMARY KEY (account_id, game_key)
);

CREATE TABLE IF NOT EXISTS game_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_key text NOT NULL REFERENCES games(key),
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  prize_chips integer NOT NULL DEFAULT 0,
  note text,
  voided boolean NOT NULL DEFAULT false,
  recorded_by uuid REFERENCES accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  image_path text,
  cost integer NOT NULL CHECK (cost >= 2),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prize_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prize_id uuid NOT NULL REFERENCES prizes(id) ON DELETE RESTRICT,
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  recorded_by uuid REFERENCES accounts(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chip_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  base_delta integer NOT NULL DEFAULT 0,
  prize_delta integer NOT NULL DEFAULT 0,
  reason text NOT NULL,
  recorded_by uuid REFERENCES accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS score_snapshots (
  participant_id uuid PRIMARY KEY REFERENCES participants(id) ON DELETE CASCADE,
  identity_points integer NOT NULL,
  vampire_points integer NOT NULL,
  total_points integer NOT NULL,
  identity_correct integer NOT NULL,
  identity_wrong integer NOT NULL,
  vampire_correct integer NOT NULL,
  vampire_wrong integer NOT NULL,
  is_vampire boolean NOT NULL,
  is_winner boolean NOT NULL DEFAULT false,
  tied_for_lead boolean NOT NULL DEFAULT false,
  last_guess_at timestamptz,
  computed_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO event_settings (id, public_intro, rules_text)
VALUES (
  1,
  $intro$Natten den 1 november 2026 öppnar en hemlig klubb i källaren på Folkets hus i Sala. Sala Analoga Spelförening och ungdomsverksamheten SUS bjuder in till ett maskerat rollspel: poker och spel om marker, ett mysterium om vem som gömmer sig bakom masken, och en vampyr som rör sig bland gästerna.

Sidan är klubbens medlemsregister. Porträtt, identiteter och vampyrroller syns bara för den som är inloggad och har rätt att se dem.$intro$,
  $rules$Så fungerar kvällen

Alla är förklädda. På hemsidan finns porträtten utan mask, och namnen för sig. Under kvällen försöker ni para ihop rätt namn med rätt bild, och peka ut vilka som är vampyrer.

Entré
Dörrvakten söker upp din registrering. Du säger kvällens lösenord. När du är incheckad får du 100 basmarker. Din personliga dörrkod finns på din klubbsida om dörrvakten behöver den.

Inbjudningar
SUS-medlemmar och godkända SAS-medlemmar kan bjuda in högst två gäster. En inbjudan fungerar en gång. Gäster får inte egna inbjudningar, om inte arrangören ger dem den rätten separat.

Marker
Basmarker är spelvaluta. De finns fysiskt vid borden. Hemsidan registrerar de 100 du får i dörren, vampyrbonus och eventuella rättningar, men inte varje pokerhand.
Prismarker delas ut när du vinner spel. De löses in i Banken mot riktiga priser. Minsta priset kostar 2 prismarker. Övriga nivåer bestäms av arrangören och kan ändras.

Identitetsmysteriet
Para ihop ett namn med ett porträtt. Du kan ändra dig tills tävlingen stänger. Bara den sista gissningen för varje porträtt räknas.
Rätt namn ger +1 poäng. Fel namn ger −1 poäng. Ett porträtt du lämnar tomt ger 0.

Vampyrspelet
En slumpad deltagare är Den Förste och får två röda kort. Ett rött kort kan förvandla en annan gäst. Den som accepterar går till Banken, blir registrerad som vampyr och får 20 extra basmarker och 1 prismark. Kortet kan sedan förvandla ytterligare en person. Det finns bara två kort, men vampyrerna kan bli fler.
Man kan bara bli vampyr en gång och bara få bonusen en gång.
Om Den Förste får bonus redan från start bestämmer arrangören i kontrollpanelen.
Vampyrer kan inte vinna överlevnadspriset. Det syns ingen offentlig notis när någon förvandlas.

Vampyrgissningar
Vid varje namn kan du säga vampyr, människa eller lämna tomt. Tomt ger 0 poäng. Rätt ger +1 och fel ger −1. Gissningarna ingår i samma totalpoäng som identitetsmysteriet. Facit är vilka som faktiskt är vampyrer när tävlingen stänger.

Överlevnadspriset
Vinnaren är den som fortfarande är människa och har högst totalpoäng. Vampyrer är diskvalificerade även om de har fler poäng. Lika poäng avgörs enligt inställningen i kontrollpanelen: delat pris, tidigaste färdiga gissning, eller att arrangören utser vinnaren.

Spelen
Texas Hold'em, Själpoker och Ride the Bus spelas vid borden. Spelledaren registrerar utdelade prismarker. Exakta kriterier för en omgång kan ändras av arrangören under respektive spel.

Banken
I Banken kan du få nya basmarker genom en utmaning om du har slut, registrera en förvandling med rött kort, och växla in prismarker mot priser.$rules$
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO games (key, name, summary, rules, sort_order) VALUES
(
  'holdem',
  'Texas Hold''em',
  'Poker med basmarker. Kom och gå mellan händerna.',
  'Ni spelar om era basmarker. Vinnaren av en kvalificerad omgång får markerna i potten och 1 prismark. Vad som räknas som en kvalificerad omgång bestäms av spelledaren och kan skrivas om här.',
  1
),
(
  'sjalpoker',
  'Själpoker',
  'Ett av klubbens tre spel. Reglerna fylls i av spelledaren.',
  'Detaljreglerna för Själpoker fastställs separat. Spelledaren registrerar prismarkerna här när någon vinner.',
  2
),
(
  'ride-the-bus',
  'Ride the Bus',
  'Kortspel där man kan vinna basmarker och prismarker.',
  'Ride the Bus spelas enligt spelledarens genomgång. Vinster i basmarker hanteras med de fysiska markerna. Utdelade prismarker registreras på hemsidan.',
  3
)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS staff_posts (
  key text PRIMARY KEY,
  title text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  account_id uuid UNIQUE REFERENCES accounts(id) ON DELETE SET NULL,
  claimed_at timestamptz
);

INSERT INTO staff_posts (key, title, sort_order) VALUES
  ('manager', 'Manager', 1),
  ('holdem', 'Croupier Texas Hold''em', 2),
  ('sjalpoker', 'Croupier Själpoker', 3),
  ('ride-the-bus', 'Croupier Ride the Bus', 4),
  ('prize-master', 'Prize Master', 5)
ON CONFLICT (key) DO NOTHING;

INSERT INTO prizes (name, description, cost, stock, sort_order)
SELECT
  'Litet pris',
  'Första prisnivån kostar 2 prismarker. Byt namn, beskrivning, bild och antal i kontrollpanelen.',
  2,
  0,
  1
WHERE NOT EXISTS (SELECT 1 FROM prizes);
