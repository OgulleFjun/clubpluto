export interface StaffPostCopy {
  key: string;
  title: string;
  image: string;
  allmän: string[];
  kväll: string[];
  uppgift: string[];
  spel: string[];
}

export const maskRule =
  'Du måste vara utklädd till oigenkännlighet. Masken stannar på hela kvällen. Ingen, inte ens de andra i personalen, ska kunna se vem du är.';

export const staffPosts: StaffPostCopy[] = [
  {
    key: 'manager',
    title: 'Manager',
    image: '/posts/manager.jpg',
    allmän: [
      'Du håller ihop personalen och ser till att kvällen rullar. Du delar inte kort och du spelar inte själv.',
      'Dräkten är en anka i hög hatt, frack och käpp. Ansiktet är täckt. Rösten och sättet får gärna vara någon annans än ditt vanliga.',
      'Du är den de andra frågar när ett bord står stilla, en gäst vill ta av sig masken, eller ett uppdrag saknar personal.',
    ],
    kväll: [
      'Kvällen är 1 november 2026, klockan 18:30, i källaren på Folkets hus i Sala.',
      'Gästerna är maskerade. Det gäller personalen också. Den som syns utan förklädnad får gå ut och klä om innan personen kommer in igen.',
      'Tre bord är igång: Texas Hold’em, Själpoker och Ride the Bus. Banken byter prismarker mot priser. Dörren checkar in gästerna och lämnar ut 100 basmarker.',
    ],
    uppgift: [
      'Var på plats i god tid, utklädd, och gå igenom kvällen med den personal som har kommit.',
      'Kontrollera att alla fem uppdrag är tillsatta. Saknas någon, lös det innan dörren öppnar eller täck luckan själv en stund.',
      'Håll maskerna på. Påminn vänligt, både gäster och personal.',
      'Gå mellan borden. Ett bord som väntar på spelledare eller marker är ditt att lösa.',
      'Blanda dig inte i händerna. Croupieren bestämmer vid sitt bord. Du bestämmer om rummet, tempot och att reglerna följs.',
      'Vid slutet samlar du personalen. Prismarker och priser stäms av med Prize Master innan ni går hem.',
    ],
    spel: [
      'Du har inget eget bord. Du kan reglerna tillräckligt för att hjälpa en croupier som kör fast.',
      'Texas Hold’em: poker om basmarker. Vinnaren av en spelad omgång får potten och 1 prismark.',
      'Själpoker: varje spelare har ett kort mot pannan och ser alla andras kort utom sitt eget. Högst kort vinner potten och 1 prismark.',
      'Ride the Bus: fyra gissningar på rad. Den som klarar hela raden vinner potten och 1 prismark.',
      'Basmarker finns bara som fysiska marker. Prismarker skrivs upp av croupieren. Priser löses bara in hos Prize Master, minst 2 prismarker.',
    ],
  },
  {
    key: 'holdem',
    title: 'Croupier Texas Hold’em',
    image: '/posts/holdem.jpg',
    allmän: [
      'Du delar Texas Hold’em. Du spelar inte med själv och du ger inga råd om hur en gäst ska satsa.',
      'Du är utklädd så att ingen känner igen dig. Västen och masken sitter på tills kvällen är slut.',
      'Du håller ordning på giv, insatser och vem som vann. Prismarkerna skriver du upp innan nästa giv börjar.',
    ],
    kväll: [
      'Bordets gäster kommer och går mellan händerna. De spelar med de basmarker de fick i dörren, 100 stycken.',
      'Basmarkerna stannar på bordet. Hemsidan räknar inte varje hand.',
      'En omgång som spelas klart ger vinnaren 1 prismark. Det är det enda du för in.',
    ],
    uppgift: [
      'Duka bordet: kortlek, dealer-knapp, basmarker och en liten hög prismarker att dela ut.',
      'Förklara blinds en gång för bordet: lilla mörken 5 basmarker, stora mörken 10. Knappen går ett steg medsols efter varje giv.',
      'Dela två dolda kort till varje spelare. Sedan en satsningsrunda.',
      'Lägg tre gemensamma kort, sedan ett, sedan ett. En satsningsrunda efter varje.',
      'Den som har bäst hand, eller den som är ensam kvar, vinner potten.',
      'Ge vinnaren 1 prismark och skriv upp det under Spelledare innan du delar nästa giv.',
      'Om någon blir osams om en hand: korten ligger kvar, du säger vad som gäller, och ni spelar vidare. Hämta managern om det inte räcker.',
    ],
    spel: [
      'Två till åtta spelare. Du delar varje giv. Spelarna satsar själva.',
      'Ett byte är minst lika stort som stora mörken. En spelare kan lägga sig, syna, höja eller checka när ingen har satsat.',
      'På bordet ligger till slut fem gemensamma kort. Varje spelare gör bästa hand av fem kort, med sina två och de gemensamma.',
      'Bästa handen vinner: färgstege, fyrtal, kåk, färg, stege, triss, två par, par, högt kort.',
      'Spelas given till visning, eller vinner någon en pott på minst 20 basmarker utan visning, får vinnaren också 1 prismark.',
      'Oavgjort: dela basmarkerna. Prismarket går till den som sitter närmast knappen på vänster sida. Skriv en anteckning.',
    ],
  },
  {
    key: 'sjalpoker',
    title: 'Croupier Själpoker',
    image: '/posts/sjalpoker.jpg',
    allmän: [
      'Du håller i Själpoker. Spelet är kort: en omgång tar några minuter, så bordet kan ta nya gäster ofta.',
      'Du är utklädd till oigenkännlighet och spelar inte med själv.',
      'Din uppgift är att alla förstår att de inte får se sitt eget kort, och att rätt person får potten och prismarket.',
    ],
    kväll: [
      'Gästerna satsar basmarker de redan har. De kan lämna bordet mellan omgångarna.',
      'En klar omgång ger vinnaren 1 prismark. Skriv upp det direkt.',
      'Håll rösten låg. Korten mot pannan är lätta att skymta för fel person om ni lutar er över bordet.',
    ],
    uppgift: [
      'Ta tre till sex spelare. Förklara spelet en gång: du ser alla andras kort, aldrig ditt eget.',
      'Blanda och ge varje spelare ett kort som de håller mot pannan, med framsidan ut.',
      'Den som sitter till vänster om dig börjar. Var och en lägger sig eller satsar basmarker i potten.',
      'När satsningen är klar vänder ni korten. Högst kort vinner potten.',
      'Ge vinnaren 1 prismark och skriv upp det.',
      'Byt ut den som vill lämna bordet och dela nästa omgång.',
    ],
    spel: [
      'Varje spelare har ett kort. De håller det mot pannan så att de andra ser valören, men inte de själva.',
      'Ess är högst, sedan kung, dam, knekt, tia och nedåt. Färg spelar ingen roll. Två lika kort delar potten.',
      'Första satsningen är 5 basmarker om man vill vara med. Sedan kan man syna eller lägga sig. Ingen höjning över 20 i en och samma omgång, så att en gäst inte blir av med allt på ett kort.',
      'Den som lägger sig visar inte kortet förrän omgången är slut, och är inte med i potten.',
      'Vinnaren får basmarkerna i potten och 1 prismark.',
      'Tittar en spelare på sitt eget kort är omgången förverkad för den personen. Kortet läggs bort och de marker personen redan lagt stannar i potten.',
    ],
  },
  {
    key: 'ride-the-bus',
    title: 'Croupier Ride the Bus',
    image: '/posts/ride.jpg',
    allmän: [
      'Du kör Ride the Bus, ett kortspel med fyra gissningar på rad. En gäst i taget åker.',
      'Du är maskerad och spelar inte själv. Du vänder korten och håller potten.',
      'Spelet spelas om basmarker, inte om att dricka. Fel gissning kostar marker.',
    ],
    kväll: [
      'Kön får gärna stå vid bordet. En resa tar en minut, så många hinner spela.',
      'Den som klarar alla fyra stoppen vinner potten och 1 prismark.',
      'Skriv upp prismarket innan nästa gäst sätter sig.',
    ],
    uppgift: [
      'Lägg fyra kort med baksidan upp i en rad. Förklara de fyra stoppen högt.',
      'Gästen gissar innan du vänder varje kort. Vänd kortet så att alla ser.',
      'Rätt gissning: gå till nästa kort. Fel gissning: gästen lägger 5 basmarker i potten och resan är slut.',
      'Fyra rätt: gästen tar potten och får 1 prismark av dig. Skriv upp det.',
      'Blanda tillbaka korten och lägg en ny rad åt nästa gäst.',
      'Håll tempot. Förklara stoppen igen om någon är ny vid bordet.',
    ],
    spel: [
      'Fyra kort på rad, baksidan upp. Gästen gissar ett stopp i taget, innan kortet vänds.',
      'Stopp 1: rött eller svart.',
      'Stopp 2: högre eller lägre än kortet innan. Ess är högst. Lika valör räknas som fel.',
      'Stopp 3: innanför eller utanför de två kort som redan ligger. Lika som något av dem räknas som fel.',
      'Stopp 4: vilken färg kortet har: hjärter, ruter, spader eller klöver.',
      'Fel gissning kostar 5 basmarker till potten. Rätt hela vägen ger potten tillbaka plus 1 prismark. Potten kan alltså växa när flera gäster missar innan någon klarar resan.',
    ],
  },
  {
    key: 'prize-master',
    title: 'Prize Master',
    image: '/posts/prize.jpg',
    allmän: [
      'Du sköter Banken. Hos dig växlar gästerna prismarker mot priser, och vampyrer registreras.',
      'Du är utklädd till oigenkännlighet. Disken, masken och priserna är det gästerna ska minnas, inte ditt ansikte.',
      'Du tar bara prismarker för priser. Basmarker är till borden och lämnas inte in hos dig.',
    ],
    kväll: [
      'Minsta priset kostar 2 prismarker. Dyrare priser står på skylten vid disken.',
      'En gäst kan bara bli vampyr en gång. Den som lämnar in ett rött kort och tackar ja får 20 basmarker och 1 prismark, och är sedan vampyr.',
      'Vampyrer kan inte vinna överlevnadspriset. Säg inte högt vem som just förvandlades.',
    ],
    uppgift: [
      'Ställ i ordning disken före 18:30: priser, skylt med pris i prismarker, och en ask för inlämnade marker.',
      'När någon vill växla in: räkna prismarkerna, peka på priset, lämna ut det och skriv upp namn, pris och antal.',
      'Lämna aldrig ut ett pris mot basmarker eller mot ett löfte om senare vinst.',
      'Rött kort: kontrollera att personen inte redan är vampyr. Registrera förvandlingen, ge 20 basmarker och 1 prismark, och behåll kortet.',
      'Tar basmarkerna slut hos en gäst kan du ge en ny chans genom kvällens utmaning, om managern har sagt att den är öppen. Skriv upp det.',
      'Vid slutet räknar du kvarvarande priser med managern och stämmer av listan.',
    ],
    spel: [
      'Banken är inget kortspel. Det här är reglerna du dömer efter.',
      'Prismarker kommer från borden: 1 prismark när en croupier säger att en omgång är vunnen. Du löser in dem, du delar inte ut dem för en pokerhand.',
      'Ett pris kostar det antal prismarker som står på skylten. Minst 2. Växel ges inte. För många marker ligger kvar hos gästen.',
      'Ett pris som är slut är slut. Erbjud ett annat pris i samma kostnad om det finns, annars behåller gästen sina marker.',
      'Vampyrbonusen är 20 basmarker och 1 prismark, en gång per person. Den Förste kan redan ha fått sin bonus. Fråga managern om du är osäker.',
      'Överlevnadspriset delas inte ut vid disken under kvällen. Det sköts när facit visas.',
    ],
  },
];

export function postCopy(key: string) {
  return staffPosts.find((post) => post.key === key);
}
