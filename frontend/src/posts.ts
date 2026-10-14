export interface StaffPostCopy {
  key: string;
  title: string;
  image: string;
  later?: boolean;
  croupier?: boolean;
  plats: string;
  kväll: string[];
  uppgift: string[];
  spel: string[];
}

export const whenWhere = {
  date: 'Söndag 1 november 2026.',
  place: 'Folkets hus, Sala.',
  time: 'Samling klockan 17:00. Ytterdörren öppnar klockan 18:30.',
};

export const vampireRules = [
  'En slumpad gäst är Den Förste och börjar med två röda kort.',
  'Den Förste kan erbjuda ett rött kort till en annan gäst. Den som tackar ja går till Banken, blir registrerad som vampyr och får 20 spelmarker och 1 vinstmark. Det går bara en gång per person.',
  'Den som får någon annan att bli vampyr får själv 1 vinstmark. Det går att tjäna högst två, en för varje person man förvandlar.',
  'Kortet kan sedan förvandla ytterligare en person. Det finns bara två kort, men vampyrerna kan bli fler.',
  'Säg inte högt vem som blev vampyr. Ingen offentlig notis går ut.',
  'På hemsidan gissar gästerna vilka som är vampyrer, och vilket namn som hör till vilket porträtt. Rätt ger +1, fel ger −1, tomt ger 0.',
  'Vampyrer kan inte vinna överlevnadspriset, även om de har flest poäng. Klockan 20:30 går priset till den som fortfarande är människa och har högst poäng på gissningarna.',
  'Om Den Förste också får 20 spelmarker och 1 vinstmark redan från start bestäms på genomgången klockan 17:00. Fråga Managern innan det betalas ut.',
];

export const prizeRules = [
  'Varje gäst börjar med spelmarker till ett värde av 100. De kan tas med mellan borden. De kan inte bytas mot priser.',
  'Bara prismarker köper priser. Croupieren skriver upp dem direkt. Hemsidan räknar inte spelmarkerna.',
  'Texas Hold’em ger spelmarker till den som vinner handen, inga vinstmarker. Själ-poker ger 1 vinstmark till vinnaren. Ride the Bus ger 1 vinstmark efter tre rätt stopp och 3 om alla fyra klaras.',
  'Den som förvandlar någon annan får 1 vinstmark, högst två. Den nya vampyren får 1 vinstmark när den registreras. Hur det går till står under Vampyr.',
  'Fem nivåer: 2, 4, 6, 9 och 12 vinstmarker. Prize Master tar emot markerna och lämnar ut priset. Skriv upp namn, nivå och antal.',
  'Den som har slut på spelmarker får 50 nya om den dansar framför Prize Master. En prismark kan i stället bytas mot 100 spelmarker.',
  'Överlevnadspriset delas ut klockan 20:30 till den som fortfarande är människa och har högst poäng på gissningarna. Det lämnas inte ut vid disken innan dess.',
];

export function welcomeCopy() {
  return [
    'Tack för att du ställer upp. Club Pluto blir till för att du är här.',
    'Det är ett spökvampyrlajv. Gästerna kommer förklädda, det spelas musik, och en stor del av upplevelsen är att gissa vem som är vem. Masken stannar på hela kvällen. Försök ändra rösten, så att ingen känner igen dig på hur du låter. Inte ens de andra i personalen ska kunna se vem du är.',
    'Rutan ovan visar datum, tid och var just du står.',
    'Läs de andra flikarna innan du ansöker.',
  ];
}

export const primaryPostKeys = ['manager', 'holdem', 'sjalpoker', 'ride-the-bus'];

const evening = [
  'Samling klockan 17:00 i Folkets hus. Då går ni igenom kvällen och gör i ordning era platser.',
  'Klockan 18:30 öppnas ytterdörren. Bouncern släpper in en gäst i taget. Den som kan lösenordet får gå ner i källaren. Den som inte kan det stannar utanför.',
  'Hos Managern registreras gästen och får sina startmarker. Sedan går gästen ut och spelar.',
  'Tre spel pågår: Texas Hold’em, Själ-poker och Ride the Bus. Banken tar emot vampyrer och priser.',
];

export const staffPosts: StaffPostCopy[] = [
  {
    key: 'manager',
    title: 'Manager',
    image: '/posts/manager.jpg',
    plats: 'Registreringen i källaren.',
    kväll: evening,
    uppgift: [
      '17:00: var på plats. Gå igenom kvällen med personalen och ställ i ordning registreringen.',
      'Dräkten är en anka i hög hatt, frack och käpp. Ansiktet är täckt.',
      'Kontrollera att de tre croupiererna har varsitt bord.',
      '18:30: ta emot gästerna som Bouncern skickar ner. Pricka av registreringen, ta en bild i förklädnad och lägg den i mysteriet. Ge spelmarker till ett värde av 100.',
      'Poängen för vem som är vem och för vampyrgissningarna syns under fliken Poäng.',
      'Under Vampyr visar du bilder på de två senaste vampyrerna. Den nya pekar på vem som förvandlade den. Knappen ger den gamla vampyren en vinstmark, högst två.',
      'Skicka gästen vidare till borden. Du ger inga marker vid ytterdörren.',
      'Du är den de andra frågar när ett bord står stilla eller någon vill ta av sig masken. Croupieren bestämmer vid sitt eget bord.',
      'Vid slutet stämmer du av med Prize Master.',
    ],
    spel: [
      'Du har inget eget bord. Du kan borden tillräckligt för att hjälpa en croupier som kör fast.',
      'Reglerna står hos den croupier som håller spelet. Det som ännu är öppet låses klockan 17:00.',
    ],
  },
  {
    key: 'holdem',
    title: 'Croupier Texas Hold’em',
    image: '/posts/holdem.jpg',
    croupier: true,
    plats: 'Texas Hold’em-bordet i källaren.',
    kväll: evening,
    uppgift: [
      '17:00: var på plats och duka bordet. Kortlek, marker och en plats där kön kan stå.',
      '18:30: var vid bordet. Förklara spelet som det står under Ditt spel. Du spelar inte med och du säger inte hur en gäst ska satsa.',
      'Håll givarna korta, så att nya gäster hinner sätta sig mellan händerna.',
      'Vinnaren får spelmarkerna i potten. Skriv inte upp någon vinstmark.',
      'Blir det osämja: korten ligger kvar och du säger vad som gäller. Hämta Managern om det inte räcker.',
    ],
    spel: [
      'Varje spelare får två dolda kort. På bordet läggs gemensamma kort, först tre, sedan ett, sedan ett.',
      'Lilla blind är 1 spelmark. Stora blind är 2. Spelarna satsar spelmarker mellan korten. Den som vinner handen tar potten. Den som är ensam kvar vinner också.',
      'Gäster får lämna bordet mellan händer och komma tillbaka senare.',
      'En vunnen hand ger inga vinstmarker. Spelmarkerna stannar på bordet.',
    ],
  },
  {
    key: 'sjalpoker',
    title: 'Croupier Själ-poker',
    image: '/posts/hitta.jpg',
    croupier: true,
    plats: 'Själ-poker i källaren.',
    kväll: evening,
    uppgift: [
      '17:00: var på plats. Då bestäms var korten göms, hur lång tid en omgång tar och hur banan ställs tillbaka.',
      'Gör i ordning gömställena innan klockan 18:30.',
      'Förklara omgången som den står under Ditt spel. Du spelar inte med.',
      'Ta emot korten som hittats och spelats, och blanda in dem i leken. Den som saknar kort får fem. Den som har färre än fem kan få nya av dig.',
      'Det kostar 5 spelmarker att vara med. Efter bettningen vinner bäst hand. Skriv upp 1 vinstmark och ta nästa.',
      'Håll tempot. En omgång som drar ut stoppar kön till de andra borden.',
      'Är reglerna inte låsta efter genomgången: spela inte skarpt förrän Managern sagt ja.',
    ],
    spel: [
      'Spelarna letar efter kort och bygger en hand.',
      'Alla kort som hittats och spelats lämnas till dig. Du kan blanda in dem i leken.',
      'Har en spelare inga kort får den fem kort av dig. Har den färre än fem kan den få nya kort av dig.',
      'Det kostar 5 spelmarker att vara med. Sedan bettas det. Bäst hand vinner och får 1 vinstmark.',
    ],
  },
  {
    key: 'ride-the-bus',
    title: 'Croupier Ride the Bus',
    image: '/posts/ride.jpg',
    croupier: true,
    plats: 'Ride the Bus-bordet i källaren.',
    kväll: evening,
    uppgift: [
      '17:00: var på plats. Lägg fram en kortlek och en pott.',
      'Förklara stoppen som de står under Ditt spel, innan första kortet vänds. Du spelar inte själv. Gästen väljer själv hur många spelmarker som satsas.',
      'En gäst i taget. Vänd ett kort först när gästen har gissat.',
      'Skriv upp vinstmarken innan nästa gäst sätter sig: 1 efter tre rätt stopp, 3 om alla fyra klaras. Blanda och lägg en ny rad. Potten ligger kvar när någon missar.',
    ],
    spel: [
      'Fyra kort på rad, baksidan upp. En gäst gissar ett stopp i taget, innan kortet vänds.',
      'Stopp 1: rött eller svart.',
      'Stopp 2: högre eller lägre än kortet innan. Ess är högst. Lika valör räknas som fel.',
      'Stopp 3: innanför eller utanför de två kort som redan ligger. Lika som något av dem räknas som fel.',
      'Stopp 4: vilken färg kortet har, hjärter, ruter, spader eller klöver.',
      'Gästen bestämmer själv hur många spelmarker som satsas innan korten vänds. Fel gissning: insatsen går i potten och resan tar slut.',
      'Tre rätt stopp ger 1 vinstmark. Den behålls även om stopp 4 blir fel.',
      'Alla fyra stopp ger 3 vinstmarker och potten i spelmarker.',
    ],
  },
  {
    key: 'prize-master',
    title: 'Prize Master',
    image: '/posts/prize.jpg',
    later: true,
    plats: 'Banken i källaren.',
    kväll: evening,
    uppgift: [
      'Om du redan är vald: var med på genomgången klockan 17:00.',
      'Ställ i ordning Banken före 18:30. Priser, skylt och en plats för röda kort.',
      'Du tar inte emot gäster vid ytterdörren och du ger inte ut startmarkerna.',
      'Den som dansar framför dig och har slut på spelmarker får 50 nya. En prismark kan bytas mot 100 spelmarker.',
      'Du kan få ta hand om en liten bar.',
      'Rött kort: följ fliken Vampyr.',
      'Inlösen av priser: följ fliken Priser.',
    ],
    spel: [
      'Banken är inget av de tre borden. Du tar emot det croupiererna redan har delat ut.',
    ],
  },
  {
    key: 'bouncer',
    title: 'Bouncer',
    image: '/posts/bouncer.jpg',
    later: true,
    plats: 'Ytterdörren.',
    kväll: evening,
    uppgift: [
      'Om du redan är vald: var med klockan 17:00. Entrélösenordet är 123ABC!. Skriv inte upp det där gäster kan se det.',
      'Stå vid ytterdörren innan 18:30. Ingen kö får rinna in av sig själv.',
      '18:30: en gäst i taget. Be om lösenordet. Kan gästen det, skicka ner personen till Managern. Annars stannar gästen utanför.',
      'Du registrerar inte gästen och du ger inte ut marker.',
      'Håll ordning i entrén och i trappan. Ingen går ner utan att ha sagt lösenordet till dig.',
      'Bråk eller någon som vägrar förklädnaden: håll personen vid dörren och hämta Managern. Lämna inte ytterdörren obevakad.',
    ],
    spel: [
      'Du spelar inte. Efter Managern går gästen till ett av de tre borden. Du behöver bara kunna visa vägen.',
    ],
  },
];

export function postCopy(key: string) {
  return staffPosts.find((post) => post.key === key);
}
