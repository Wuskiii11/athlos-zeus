import React from "react";
import { useTheme } from "../theme";
import { Mono, Kicker, BackBtn } from "../components/UI";

export default function ScreenPrivacy({ onBack }) {
  const C = useTheme();
  const H = ({ children }) => <h3 style={{ fontFamily: C.display, fontWeight: 800, fontSize: 16, color: C.text, textTransform: "uppercase", margin: "22px 0 8px" }}>{children}</h3>;
  const P = ({ children }) => <p style={{ color: C.text2, fontSize: 13, lineHeight: 1.6, margin: "0 0 10px" }}>{children}</p>;
  const LI = ({ children }) => <li style={{ color: C.text2, fontSize: 13, lineHeight: 1.55, marginBottom: 6 }}>{children}</li>;
  return (
    <div style={{ padding: "8px 20px 24px" }}>
      <header style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
        <BackBtn onClick={onBack} />
        <div>
          <Kicker>PRAVNO</Kicker>
          <h2 style={{ fontFamily: C.display, fontWeight: 800, fontSize: 24, margin: 0, color: C.text, letterSpacing: "-0.02em" }}>Politika zasebnosti</h2>
        </div>
      </header>
      <Mono style={{ color: C.muted, fontSize: 9, display: "block", marginBottom: 16 }}>ZADNJA POSODOBITEV: 6. JUNIJ 2026</Mono>
      <P>Ta politika zasebnosti opisuje, kako ATHLOS d.o.o. (Jarska cesta 70, Slovenija) zbira, uporablja in deli tvoje podatke pri uporabi aplikacije ATHLOS, ter tvoje pravice glede zasebnosti.</P>
      <H>Katere podatke zbiramo</H>
      <P>Osebni podatki, ki nam jih posreduješ:</P>
      <ul style={{ paddingLeft: 18, margin: "0 0 10px" }}>
        <LI>E-poštni naslov</LI>
        <LI>Ime in priimek</LI>
        <LI>Telefonska številka</LI>
        <LI>Naslov, mesto, poštna številka</LI>
      </ul>
      <P>Podatki o uporabi (samodejno): IP naslov, tip in različica brskalnika, obiskane strani, trajanje seje in interakcije.</P>
      <P>Z dovoljenjem dostopamo tudi do: lokacije, kamere in galerije fotografij (za profilno sliko in video analizo vaj).</P>
      <H>Kako uporabljamo podatke</H>
      <ul style={{ paddingLeft: 18, margin: "0 0 10px" }}>
        <LI>Za zagotavljanje in vzdrževanje storitve</LI>
        <LI>Za upravljanje tvojega računa</LI>
        <LI>Za izvajanje pogodbe (naročnina, plačila)</LI>
        <LI>Za stik s teboj (e-pošta, push obvestila o treningih)</LI>
        <LI>Za analizo uporabe in izboljšave storitve</LI>
      </ul>
      <H>Hramba podatkov</H>
      <P>Osebne podatke hranimo le toliko časa, kolikor je potrebno. Podatke o računu hranimo za čas trajanja tvoje naročnine in 30 dni po odjavi.</P>
      <H>Tvoje pravice</H>
      <P>Imaš pravico do dostopa, popravka in izbrisa svojih osebnih podatkov. Podatke lahko urejaš v nastavitvah aplikacije ali nas kontaktiraš neposredno.</P>
      <H>Zasebnost otrok</H>
      <P>Storitev ni namenjena osebam, mlajšim od 16 let. Zavestno ne zbiramo podatkov oseb, mlajših od 16 let.</P>
      <H>Tretje osebe</H>
      <P>Uporabljamo zunanje ponudnike storitev (npr. Mouseflow za analitiko, Google Places), ki imajo lahko dostop do tvojih podatkov v skladu s svojimi politikami zasebnosti.</P>
      <H>Varnost</H>
      <P>Varnost tvojih podatkov nam je pomembna, vendar noben način prenosa po internetu ni 100% varen. Uporabljamo komercialno razumne ukrepe za zaščito tvojih podatkov.</P>
      <H>Kontakt</H>
      <P>Za vprašanja o tej politiki zasebnosti nas kontaktiraj:</P>
      <ul style={{ paddingLeft: 18, margin: "0 0 10px" }}>
        <LI>E-pošta: info@athl-os.com</LI>
        <LI>Telefon: 069 749 787</LI>
        <LI>Spletna stran: athlos-sync-flow.lovable.app</LI>
      </ul>
      <p style={{ textAlign: "center", color: C.muted2, fontFamily: C.display, fontSize: 11, textTransform: "lowercase", marginTop: 24 }}>ATHLOS d.o.o. © 2026</p>
    </div>
  );
}
