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
  video?: { href: string; label: string; note: string };
}

export const whenWhere = {
  date: 'Söndag 1 november 2026.',
  place: 'Folkets hus, Sala.',
  time: 'Samling klockan 17:00. Ytterdörren öppnar klockan 18:30.',
};

export const vampireRules = [
  'En slumpad gäst är Den Förste och börjar med två röda kort.',
  'Den Förste kan erbjuda ett rött kort till en annan gäst. Den som tackar ja går till Banken, blir registrerad som vampyr och får 20 spelmarker och 1 prismark. Det går bara en gång per person.',
  'Den som får någon annan att bli vampyr får själv 1 prismark. Det går att tjäna högst två, en för varje person man förvandlar.',
  'Kortet kan sedan förvandla ytterligare en person. Det finns bara två kort, men vampyrerna kan bli fler.',
  'Säg inte högt vem som blev vampyr. Ingen offentlig notis går ut.',
  'På hemsidan gissar gästerna vilka som är vampyrer, och vilket namn som hör till vilket porträtt. Rätt ger +1 poäng, fel ger −1 poäng, tomt ger 0 poäng. Det är poäng, inte marker. Poängen avgör vem som kan vinna överlevnadspriset.',
  'Vampyrer kan inte vinna överlevnadspriset, även om de har flest poäng. Klockan 20:30 går priset till den som fortfarande är människa och har högst poäng på gissningarna.',
];

export const markerGuide = [
  {
    kind: 'spel' as const,
    title: 'Spelmarker',
    lines: [
      'Varje gäst börjar med spelmarker till ett värde av 100.',
      'De kan tas med mellan borden.',
      'De kan inte köpa priser.',
      'Texas Hold’em: den som vinner handen tar spelmarkerna i potten.',
      'Själ-poker kostar 5 spelmarker att vara med. I Ride the Bus bestämmer gästen själv insatsen. Fel gissning lägger insatsen i potten.',
      'Den som har slut får 50 nya spelmarker genom att dansa framför Prize Master, eller byter 1 prismark mot 100 spelmarker.',
    ],
  },
  {
    kind: 'pris' as const,
    title: 'Prismarker',
    lines: [
      'Bara prismarker köper priser hos Prize Master, och bara barn och ungdomar kan vinna dem.',
      'Prismarker kan ges bort om man vill.',
      'Själ-poker ger 1 prismark till vinnaren.',
      'Ride the Bus ger 1 prismark efter tre rätt kort, och 3 prismarker om alla fyra blir rätt.',
      'En ny vampyr får 1 prismark. Den som förvandlar någon annan får 1 prismark, högst två.',
      'Nivåerna kostar 2, 4, 6, 9 och 12 prismarker.',
    ],
  },
];

export const prizeRules = [
  'Priser hos Prize Master köps bara med prismarker, och bara barn och ungdomar kan vinna dem. Prismarker kan ges bort. Skillnaden mot spelmarker står under Marker.',
  'Fem nivåer: 2, 4, 6, 9 och 12 prismarker. Prize Master tar emot prismarkerna och lämnar ut priset. Skriv upp namn, nivå och antal.',
  'Överlevnadspriset delas ut klockan 20:30 till den som fortfarande är människa och har högst poäng på gissningarna. Poängen är inte marker, och priset lämnas inte ut vid disken innan dess.',
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
  'Hos Managern registreras gästen och får sina spelmarker. Sedan går gästen ut och spelar.',
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
      'Under Vampyr visar du bilder på de två senaste vampyrerna. Den nya pekar på vem som förvandlade den. Knappen ger den gamla vampyren en prismark, högst två.',
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
      'Vinnaren får spelmarkerna i potten. Skriv inte upp någon prismark.',
      'Blir det osämja: korten ligger kvar och du säger vad som gäller. Hämta Managern om det inte räcker.',
    ],
    spel: [
      'Varje spelare får två dolda kort. På bordet läggs gemensamma kort, först tre, sedan ett, sedan ett.',
      'Lilla blind är 1 spelmark. Stora blind är 2. Spelarna satsar spelmarker mellan korten. Den som vinner handen tar potten. Den som är ensam kvar vinner också.',
      'Gäster får lämna bordet mellan händer och komma tillbaka senare.',
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
      'Förklara att korten spelas som vanlig poker och att bäst hand vinner. Händerna står under Ditt spel. Du spelar inte med.',
      'Ta emot korten som hittats och spelats, och blanda in dem i leken. Den som saknar kort får fem. Den som har färre än fem kan få nya av dig.',
      'Det kostar 5 spelmarker att vara med. Efter bettningen vinner bäst hand. Skriv upp 1 prismark och ta nästa.',
      'Håll tempot. En omgång som drar ut stoppar kön till de andra borden.',
      'Är reglerna inte låsta efter genomgången: spela inte skarpt förrän Managern sagt ja.',
    ],
    spel: [
      'Korten spelas som vanlig poker. Bäst hand vinner.',
      'Handen är spelarens fem bästa kort. Har spelaren fler än fem räknas de fem som ger bäst hand.',
      'Bäst är färgstege: fem kort i följd och i samma färg. Högst är ess, kung, dam, knekt och tia i samma färg.',
      'Sedan fyrtal: fyra kort av samma valör.',
      'Sedan kåk: tre av en valör och två av en annan.',
      'Sedan färg: fem kort i samma färg, inte i följd.',
      'Sedan stege: fem kort i följd, inte i samma färg. Ess kan ligga högst, ovanför kungen, eller lägst, under tvåan.',
      'Sedan triss: tre kort av samma valör.',
      'Sedan två par.',
      'Sedan ett par: två kort av samma valör.',
      'Sist högt kort. Ess är högst, sedan kung, dam, knekt, tia och nedåt.',
      'Är händerna lika avgör det högsta kortet som skiljer dem. Är allt lika delas potten.',
      'Spelarna letar efter kort och bygger handen av dem.',
      'Alla kort som hittats och spelats lämnas till dig. Du kan blanda in dem i leken.',
      'Har en spelare inga kort får den fem kort av dig. Har den färre än fem kan den få nya kort av dig.',
      'Det kostar 5 spelmarker att vara med. Sedan bettas det. Bäst hand vinner potten och får 1 prismark.',
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
      'Förklara korten som de står under Ditt spel, innan första kortet vänds. Du spelar inte själv. Gästen väljer själv hur många spelmarker som satsas.',
      'En gäst i taget. Vänd kortet först när gästen har gissat.',
      'Skriv upp prismarken innan nästa gäst sätter sig: 1 efter tre rätt kort, 3 om alla fyra blir rätt. Blanda och lägg en ny rad. Potten ligger kvar när någon missar.',
    ],
    spel: [
      'Fyra kort på rad, baksidan upp. En gäst gissar på ett kort i taget.',
      'Kort 1: rött eller svart.',
      'Kort 2: högre eller lägre än kortet innan. Ess är högst. Lika valör räknas som fel.',
      'Kort 3: innanför eller utanför de två kort som redan ligger. Innanför betyder mellan deras valörer. Utanför betyder högre än båda eller lägre än båda. Lika valör som något av dem räknas som fel.',
      'Kort 4: vilken färg kortet har, hjärter, ruter, spader eller klöver.',
      'Gästen bestämmer själv hur många spelmarker som satsas innan första kortet vänds. Fel gissning: insatsen går i potten och resan tar slut. Potten ligger kvar till nästa gäst.',
      'Tre rätt kort ger 1 prismark. Den behålls även om kort 4 blir fel.',
      'Alla fyra kort rätt ger 3 prismarker och potten i spelmarker.',
    ],
    video: {
      href: 'https://www.youtube.com/watch?v=wt3NTJr5W2E',
      label: 'Se de fyra gissningarna',
      note: 'Filmen visar rött eller svart, högre eller lägre, innanför eller utanför, och färg. Pyramiden och drycken efteråt spelar vi inte. Hos oss är det spelmarker och prismarker.',
    },
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
      'Du tar inte emot gäster vid ytterdörren och du ger inte ut spelmarkerna.',
      'Den som dansar framför dig och har slut på spelmarker får 50 nya. En prismark kan bytas mot 100 spelmarker.',
      'Bara barn och ungdomar kan vinna priser hos dig. En gäst får ge bort sina prismarker.',
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
      'Du registrerar inte gästen och du ger inte ut spelmarker.',
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
