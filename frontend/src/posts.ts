export interface StaffPostCopy {
  key: string;
  title: string;
  image: string;
  later?: boolean;
  croupier?: boolean;
  plats: string;
  allmän: string[];
  kväll: string[];
  uppgift: string[];
  spel: string[];
}

export const whenWhere = {
  date: 'Söndag 1 november 2026.',
  place: 'Folkets hus, Sala.',
  time: 'Samling klockan 17:00, utklädd. Ytterdörren öppnar klockan 18:30.',
};

export const vampireRules = [
  'En slumpad gäst är Den Förste och börjar med två röda kort.',
  'Den Förste kan erbjuda ett rött kort till en annan gäst. Den som tackar ja går till Banken, blir registrerad som vampyr och får 20 basmarker och 1 prismark. Det går bara en gång per person.',
  'Kortet kan sedan förvandla ytterligare en person. Det finns bara två kort, men vampyrerna kan bli fler.',
  'Säg inte högt vem som blev vampyr. Ingen offentlig notis går ut.',
  'På hemsidan gissar gästerna vilka som är vampyrer, och vilket namn som hör till vilket porträtt. Rätt ger +1, fel ger −1, tomt ger 0.',
  'Vampyrer kan inte vinna överlevnadspriset, även om de har flest poäng. Priset går till den som fortfarande är människa.',
  'Om Den Förste också får 20 basmarker och 1 prismark redan från start bestäms på genomgången klockan 17:00. Fråga Managern innan det betalas ut.',
];

export const prizeRules = [
  'Alla gäster startar med 100 basmarker och 0 prismarker. Managern ger ut startmarkerna i källaren.',
  'Basmarker spelas om vid borden. De kan inte växlas mot priser. Hemsidan räknar inte varje hand.',
  'Prismarker delas ut när någon vinner ett spel, normalt 1 styck, och när någon blir vampyr, 1 styck. Croupieren skriver upp prismarket direkt.',
  'Bara prismarker köper priser. Minsta priset kostar 2 prismarker. Prize Master i Banken tar emot markerna och lämnar ut priset.',
  'Skriv upp namn, pris och antal. Prislistan kan ändras av arrangören.',
  'Den som har slut på basmarker kan göra en kort utmaning hos Prize Master och få påfyllning. Vilka utmaningar som gäller sägs klockan 17:00.',
  'Överlevnadspriset lämnas inte ut vid disken under kvällen. Det går till den människa som har högst poäng när tävlingen stänger.',
];

export const maskRule =
  'Du måste vara utklädd till oigenkännlighet. Masken stannar på hela kvällen. Ingen, inte ens de andra i personalen, ska kunna se vem du är.';

export const atmosphere =
  'Det kommer vara musik under kvällen. En stor del av upplevelsen är att gissa vem som är vem. Försök ändra rösten, så att ingen känner igen dig på hur du låter.';

export const primaryPostKeys = ['manager', 'holdem', 'sjalpoker', 'ride-the-bus'];

const flow = [
  'Samling klockan 17:00 i Folkets hus. Då går ni igenom kvällen och gör i ordning era platser. Var där, utklädd.',
  'Klockan 18:30 öppnas ytterdörren. Bouncern släpper in en gäst i taget. Den som kan lösenordet får gå ner i källaren. Den som inte kan det stannar utanför.',
  'I källaren registrerar gästen sig hos Managern och får 100 basmarker. Sedan går gästen ut och spelar.',
  'Kvällen är söndag 1 november 2026. Tre spel pågår: Texas Hold’em, Själ-poker och Ride the Bus. Banken sköter priser, påfyllning och vampyrer.',
];

const night = [
  'Alla gäster startar med 100 basmarker och 0 prismarker. Basmarker spelas om vid borden. Bara prismarker kan växlas mot priser, minst 2 stycken.',
  'Den Förste är en slumpad gäst med två röda kort. Den som tackar ja till ett kort går till Banken, blir vampyr och får 20 basmarker och 1 prismark. Det går bara en gång.',
  'På hemsidan paras riktiga namn ihop med de förklädda gästerna, och man gissar vilka som är vampyrer. Rätt ger +1, fel ger −1. Bara den som fortfarande är människa kan vinna överlevnadspriset.',
];

export const staffPosts: StaffPostCopy[] = [
  {
    key: 'manager',
    title: 'Manager',
    image: '/posts/manager.jpg',
    plats: 'Registreringen i källaren.',
    allmän: [
      'Du står i källaren. Hit kommer gästerna efter att Bouncern släppt ner dem. Du registrerar dem och ger dem marker. Du spelar inte själv.',
      'Dräkten är en anka i hög hatt, frack och käpp. Ansiktet är täckt.',
      'Du är den de andra frågar när ett bord står stilla, en gäst vill ta av sig masken, eller ett uppdrag saknar personal.',
    ],
    kväll: [...flow, ...night],
    uppgift: [
      '17:00: var på plats. Gå igenom kvällen med personalen och ställ i ordning registreringen i källaren.',
      'Kontrollera att de tre croupiererna har varsitt bord. Prize Master och Bouncer tillsätts när de fyra viktigaste rollerna är tagna.',
      '18:30: stanna i källaren. Bouncern skickar ner en gäst i taget. Du tar emot, prickar av registreringen och ger 100 basmarker.',
      'Skicka sedan gästen vidare till spelen. Du delar inte ut marker vid ytterdörren.',
      'Under kvällen håller du maskerna på och ser till att borden rullar. Croupieren bestämmer vid sitt bord.',
      'Vid slutet stämmer du av prismarker och priser med Prize Master.',
    ],
    spel: [
      'Du har inget eget bord. Du kan spelen tillräckligt för att hjälpa en croupier som kör fast. Detaljerna låses på genomgången klockan 17:00.',
      'Texas Hold’em: gästerna kan gå in och ut mellan händer. Vinnaren får potten i basmarker och 1 prismark vid en godkänd vinst.',
      'Själ-poker: gästerna letar efter gömda kort och bygger en pokerhand. Vinnaren får 1 prismark och eventuella basmarker.',
      'Ride the Bus: en gäst gissar på fyra kort i rad. Fel gissning kostar basmarker. Den som klarar hela raden får potten och 1 prismark.',
    ],
  },
  {
    key: 'holdem',
    title: 'Croupier Texas Hold’em',
    image: '/posts/holdem.jpg',
    croupier: true,
    plats: 'Texas Hold’em-bordet i källaren.',
    allmän: [
      'Du står vid Texas Hold’em-bordet i källaren. Du delar. Du spelar inte med och du säger inte hur en gäst ska satsa.',
      'Du är utklädd så att ingen känner igen dig. Västen och masken sitter på tills kvällen är slut.',
    ],
    kväll: [
      ...flow,
      'Ditt bord tar emot gäster efter att de fått sina 100 basmarker av Managern. De kan gå in och ut mellan händer.',
      ...night,
    ],
    uppgift: [
      '17:00: var på plats, klädd, och dukar bordet under genomgången. Kortlek, marker och en plats där kön kan stå.',
      '18:30: var vid bordet när de första gästerna kommer ner. Förklara i stora drag: två dolda kort, gemensamma kort på bordet, bäst hand vinner potten.',
      'Håll givarna korta så att nya gäster kan sätta sig mellan händerna.',
      'Vid en godkänd vinst får vinnaren potten i basmarker och 1 prismark. Skriv upp prismarket innan nästa giv.',
      'Vad som räknas som en godkänd vinst bestäms på genomgången. Fram till dess delar du inga prismarker på eget bevåg.',
      'Blir det osämja: korten ligger kvar, du säger vad som gäller. Hämta Managern om det inte räcker.',
    ],
    spel: [
      'Texas Hold’em är poker. Varje spelare får två dolda kort. På bordet läggs gemensamma kort, först tre, sedan ett, sedan ett.',
      'Spelarna satsar basmarker mellan korten. Den som har bäst hand av sina två kort och bordets kort vinner potten. Den som är ensam kvar vinner också.',
      'Gäster får lämna bordet mellan händer och komma tillbaka senare.',
      'En godkänd vinst ger dessutom 1 prismark, utöver basmarkerna i potten. Exakt gräns för en godkänd vinst sägs på genomgången klockan 17:00.',
      'Basmarkerna stannar på bordet. Hemsidan räknar inte varje hand, bara prismarket du skriver upp.',
    ],
  },
  {
    key: 'sjalpoker',
    title: 'Croupier Själ-poker',
    image: '/posts/hitta.jpg',
    croupier: true,
    plats: 'Själ-poker i källaren.',
    allmän: [
      'Du håller i Själ-poker. Gästerna letar efter gömda kort och bygger en pokerhand. Du spelar inte med.',
      'Du är utklädd till oigenkännlighet. Ditt bord, eller din bana med gömställen, är i källaren.',
    ],
    kväll: [
      ...flow,
      'Gästerna kommer till dig efter att Managern gett dem marker. En omgång ska gå att förstå på en minut.',
      ...night,
    ],
    uppgift: [
      '17:00: var på plats. På genomgången bestäms var korten göms, hur lång tid en omgång tar och hur banan ställs tillbaka.',
      'Gör i ordning gömställena innan ytterdörren öppnar klockan 18:30.',
      'När en gäst kommer: förklara att de ska hitta kort och bygga en pokerhand. Starta tiden och håll ordning på vilka kort som är hittade.',
      'När tiden är slut jämför du händerna. Vinnaren får 1 prismark och de basmarker som hör till omgången.',
      'Skriv upp prismarket, göm korten igen och ta nästa gäst eller lag.',
      'Hittar ni inte på reglerna under genomgången: spela inte skarpt förrän Managern sagt att omgången är godkänd.',
    ],
    spel: [
      'I stora drag: kort ligger gömda. Spelarna letar och bygger en pokerhand av det de hittar.',
      'Bäst hand vinner. Vinnaren får 1 prismark och eventuella basmarker.',
      'Var korten ligger, hur många man får leta efter, tidsgräns och hur banan nollställs bestäms klockan 17:00. Det är de reglerna du dömer efter under kvällen.',
      'Håll tempot. En omgång som drar ut stoppar kön till de andra borden.',
    ],
  },
  {
    key: 'ride-the-bus',
    title: 'Croupier Ride the Bus',
    image: '/posts/ride.jpg',
    croupier: true,
    plats: 'Ride the Bus-bordet i källaren.',
    allmän: [
      'Du kör Ride the Bus. En gäst i taget gissar på fyra kort. Du vänder korten och håller potten. Du spelar inte själv.',
      'Du står i källaren, utklädd så att ingen känner igen dig. Spelet går på basmarker, inte på att dricka.',
    ],
    kväll: [
      ...flow,
      'Gästerna kommer en och en efter att Managern gett dem marker. En resa tar ungefär en minut.',
      ...night,
    ],
    uppgift: [
      '17:00: var på plats och lägg fram en kortlek och en pott för basmarker.',
      '18:30: när gästerna kommer ner, förklara de fyra stoppen högt innan första kortet vänds.',
      'Lägg fyra kort med baksidan upp. Gästen gissar innan du vänder varje kort.',
      'Rätt gissning: gå vidare. Fel gissning: gästen lägger 5 basmarker i potten och resan är slut.',
      'Fyra rätt: gästen tar potten och får 1 prismark. Skriv upp prismarket innan nästa gäst sätter sig.',
      'Blanda tillbaka korten och lägg en ny rad. Potten ligger kvar när någon missar, så den kan växa.',
    ],
    spel: [
      'Fyra kort på rad, baksidan upp. En gäst gissar ett stopp i taget, innan kortet vänds.',
      'Stopp 1: rött eller svart.',
      'Stopp 2: högre eller lägre än kortet innan. Ess är högst. Lika valör räknas som fel.',
      'Stopp 3: innanför eller utanför de två kort som redan ligger. Lika som något av dem räknas som fel.',
      'Stopp 4: vilken färg kortet har, hjärter, ruter, spader eller klöver.',
      'Fel gissning kostar 5 basmarker till potten och resan tar slut. Den som klarar alla fyra stopp får potten och 1 prismark.',
    ],
  },
  {
    key: 'prize-master',
    title: 'Prize Master',
    image: '/posts/prize.jpg',
    later: true,
    plats: 'Banken i källaren.',
    allmän: [
      'Du sköter Banken i källaren. Hos dig fyller gäster på basmarker, registreras som vampyrer och växlar prismarker mot priser.',
      'Du är utklädd till oigenkännlighet. Du tar inte emot gäster vid ytterdörren och du ger inte ut startmarkerna. Det gör Managern.',
    ],
    kväll: [...flow, ...night],
    uppgift: [
      'Rollen öppnas när Manager och de tre croupiererna är tillsatta. 17:00 är du ändå med på genomgången om du redan är vald.',
      'Ställ i ordning Banken före 18:30: priser, skylt och en plats för röda vampyrkort.',
      'Basmarker växlas aldrig mot priser. Den som har slut på basmarker kan göra en kort utmaning hos dig och få påfyllning. Vilka utmaningar som gäller sägs klockan 17:00.',
      'Rött kort: registrera vampyren, ge 20 basmarker och 1 prismark, en gång per person. Säg inte högt vem det var.',
      'Prismarker löses in mot priser. Minsta priset kostar 2. Skriv upp namn, pris och antal.',
      'Överlevnadspriset delas inte ut vid disken under kvällen.',
    ],
    spel: [
      'Banken är inget av de tre spelen. Spelen ger prismarkerna, du tar emot dem.',
      'Texas Hold’em, Själ-poker och Ride the Bus ger normalt 1 prismark till vinnaren, utöver basmarkerna vid bordet.',
      'Den Förste har två röda kort från start. Om den personen också får 20 basmarker och 1 prismark redan från början avgörs på genomgången. Fråga Managern innan du betalar ut det.',
      'Vampyrer kan inte vinna överlevnadspriset, även om de har flest poäng på hemsidan.',
    ],
  },
  {
    key: 'bouncer',
    title: 'Bouncer',
    image: '/posts/bouncer.jpg',
    later: true,
    plats: 'Ytterdörren.',
    allmän: [
      'Du står vid ytterdörren. Du släpper in en gäst i taget, tar emot lösenordet och skickar ner den som kan det. Sedan håller du ordning.',
      'Du registrerar inte gästen och du ger inte ut marker. Det sker hos Managern i källaren.',
      'Du är utklädd till oigenkännlighet. Masken sitter på även när du står i dörren.',
    ],
    kväll: [...flow, ...night],
    uppgift: [
      'Rollen öppnas när Manager och de tre croupiererna är tillsatta. 17:00 är du med på genomgången och lär dig lösenordet.',
      'Ställ dig vid ytterdörren innan 18:30. Ingen kö får rinna in av sig själv.',
      '18:30: öppna. Ta en gäst. Be om lösenordet. Kan gästen det, släpp ner personen i källaren till Managern. Annars stannar gästen utanför.',
      'En i taget. Nästa får vänta tills den förra är på väg ner.',
      'När dörren är igång håller du ordning i entrén och i trappan. Masker på. Ingen tränger sig ner utan att ha sagt lösenordet till dig.',
      'Bråk eller någon som vägrar förklädnaden: håll personen vid dörren och hämta Managern. Lämna inte ytterdörren obevakad.',
    ],
    spel: [
      'Du spelar inte. Du behöver ändå veta vad gästerna går till, så att du kan visa vägen.',
      'Efter Managern går gästen till ett av tre spel: Texas Hold’em, Själ-poker eller Ride the Bus.',
      'Banken är Prize Masters disk, inte din. Startmarkerna är 100 basmarker och delas ut i källaren.',
      'Lösenordet sägs på genomgången klockan 17:00. Skriv inte upp det där gäster kan se det.',
    ],
  },
];

export function postCopy(key: string) {
  return staffPosts.find((post) => post.key === key);
}
