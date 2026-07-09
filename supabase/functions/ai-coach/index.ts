// ATHLOS — AI trener (Supabase Edge Function)
//
// Podpira dva ponudnika:
//   1. Claude (ANTHROPIC_API_KEY) — najboljši odgovori, plačljivo po porabi
//   2. Google Gemini (GEMINI_API_KEY) — BREZPLAČEN nivo, uporabljen kot rezerva
// Funkcija najprej poskusi Claude; če ključa ni ali nima kreditov, uporabi Gemini.
// Ključa sta Supabase secrets in NIKOLI ne prideta v aplikacijo/brskalnik.

import Anthropic from "npm:@anthropic-ai/sdk";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Builds the system prompt — now a LEARNING coach that knows the athlete.
// `memory` is the per-athlete blob: { setup, notes[], feedback[] } (see coach_memory).
function buildSystem(profile: Record<string, any> = {}, memory: Record<string, any> = {}) {
  const setup = (memory && memory.setup) || {};
  const notes: string[] = Array.isArray(memory?.notes) ? memory.notes : [];
  const feedback: any[] = Array.isArray(memory?.feedback) ? memory.feedback : [];

  const lines = [
    "Si ATHLOS Coach — oseben AI trener v aplikaciji ATHLOS, ki športnika POZNA in se z vsakim pogovorom uči o njem.",
    "Odgovarjaš IZKLJUČNO v slovenščini, jedrnato (2–6 stavkov), konkretno in prijazno.",
    "Pokrivaš: trening, periodizacijo, regeneracijo, prehrano, preventivo poškodb in motivacijo.",
    "Pri bolečinah svetuj previdnost; pri hujših težavah priporoči zdravnika ali fizioterapevta.",
    "Ne odgovarjaj na teme izven športa — prijazno preusmeri nazaj na trening.",
  ];

  // ── KAR VEŠ o športniku (profil + funnel memory) ──
  const know: string[] = [];
  if (profile.name) know.push(`Ime: ${profile.name}.`);
  if (profile.sport) know.push(`Šport: ${profile.sport}.`);
  if (profile.height) know.push(`Višina: ${profile.height} cm.`);
  if (profile.weight) know.push(`Teža: ${profile.weight} kg.`);
  if (setup.goal) know.push(`Glavni cilj: ${setup.goal}.`);
  if (setup.level) know.push(`Nivo: ${setup.level}.`);
  if (setup.seasonPhase) know.push(`Faza sezone: ${setup.seasonPhase}.`);
  if (Array.isArray(setup.equipment) && setup.equipment.length) know.push(`Oprema: ${setup.equipment.join(", ")}.`);
  if (setup.daysPerWeek) know.push(`Dni treninga na teden: ${setup.daysPerWeek}.`);
  if (setup.sessionMinutes) know.push(`Trajanje treninga: ${setup.sessionMinutes} min.`);
  if (Array.isArray(setup.injuries) && setup.injuries.length) {
    know.push(`Poškodbe/omejitve: ${setup.injuries.join(", ")} — OBVEZNO se izogni vajam, ki te predele boleče obremenijo.`);
  }
  if (know.length) lines.push("KAR VEŠ O ŠPORTNIKU (uporabi, NE sprašuj znova): " + know.join(" "));

  // ── zadnje povratne informacije s treningov ──
  if (feedback.length) {
    const recent = feedback.slice(-4).map((f) => {
      const p: string[] = [];
      if (f?.rpe != null) p.push(`RPE ${f.rpe}`);
      if (f?.completed != null) p.push(f.completed ? "opravljeno" : "ni opravljeno");
      if (Array.isArray(f?.pain) && f.pain.length) p.push(`bolečina: ${f.pain.join(", ")}`);
      if (f?.note) p.push(String(f.note));
      return p.join(", ");
    }).filter(Boolean);
    if (recent.length) lines.push("ZADNJE POVRATNE INFORMACIJE S TRENINGOV: " + recent.join(" | ") + ".");
  }

  // ── naučene opombe ──
  if (notes.length) lines.push("NAUČENE OPOMBE O ŠPORTNIKU: " + notes.slice(-12).join(" | ") + ".");

  // ── učna pravila ──
  lines.push("PRAVILA: Sklicuj se na to, kar že veš. Vsak nasvet/plan NADGRAJUJE prejšnje (progresivna obremenitev). Upoštevaj povratne informacije: pri RPE 9–10 ali 'ni opravljeno' znižaj obremenitev; pri nizkem RPE in vse opravljeno stopnjuj. Izogni se vajam, ki obremenjujejo poškodovane predele.");
  lines.push("UČENJE: ko izveš NOVO TRAJNO dejstvo o športniku (cilj, omejitev, preferenca, napredek), na KONEC odgovora dodaj oznako [[NOTE: kratko dejstvo]] — športnik je NE vidi, aplikacija si jo zapomni. Uporabi redko in samo za trajna dejstva.");

  return lines.filter(Boolean).join(" ");
}

type Msg = { role: "user" | "assistant"; content: string };
// Priponka iz aplikacije: slika ali PDF kot base64 — jo vidita OBA ponudnika.
type Attachment = { name?: string; mime: string; data: string };

function sanitizeHistory(history: unknown): Msg[] {
  const msgs = (Array.isArray(history) ? history : [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content }));
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  return msgs;
}

function sanitizeAttachment(a: unknown): Attachment | null {
  if (!a || typeof a !== "object") return null;
  const { mime, data, name } = a as Record<string, unknown>;
  if (typeof mime !== "string" || typeof data !== "string" || !data) return null;
  if (!mime.startsWith("image/") && mime !== "application/pdf") return null;
  if (data.length > 8_000_000) return null; // ~6 MB datoteke; ščiti kvoto
  return { mime, data, name: typeof name === "string" ? name : undefined };
}

async function askClaude(system: string, msgs: Msg[], attachment: Attachment | null): Promise<string> {
  const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
  // zadnje uporabnikovo sporočilo postane multimodalno, ko je priložena datoteka
  const messages: any[] = msgs.map((m) => ({ role: m.role, content: m.content }));
  if (attachment && messages.length) {
    const last = messages[messages.length - 1];
    const media = attachment.mime === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: attachment.data } }
      : { type: "image", source: { type: "base64", media_type: attachment.mime, data: attachment.data } };
    last.content = [media, { type: "text", text: last.content }];
  }
  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 1024,
    system,
    messages,
  });
  return response.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
}

async function askGemini(system: string, msgs: Msg[], attachment: Attachment | null): Promise<string> {
  const key = Deno.env.get("GEMINI_API_KEY");
  const contents = msgs.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }] as any[],
  }));
  if (attachment && contents.length) {
    contents[contents.length - 1].parts.unshift({
      inline_data: { mime_type: attachment.mime, data: attachment.data },
    });
  }
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { maxOutputTokens: 2048, thinkingConfig: { thinkingBudget: 0 } },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const reply = (data?.candidates?.[0]?.content?.parts || [])
    .map((p: { text?: string }) => p.text || "")
    .join("")
    .trim();
  if (!reply) throw new Error("Gemini: prazen odgovor");
  return reply;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const { question, history = [], profile = {}, memory = {}, attachment = null } = await req.json();
    if (!question || typeof question !== "string") {
      return Response.json({ error: "Manjka vprašanje." }, { status: 400, headers: cors });
    }

    const system = buildSystem(profile, memory);
    const msgs = sanitizeHistory(history);
    msgs.push({ role: "user", content: question });
    const att = sanitizeAttachment(attachment);

    const errors: string[] = [];

    if (Deno.env.get("ANTHROPIC_API_KEY")) {
      try {
        return Response.json({ reply: await askClaude(system, msgs, att), provider: "claude" }, { headers: cors });
      } catch (e) {
        errors.push(`claude: ${e?.message || e}`);
      }
    }

    if (Deno.env.get("GEMINI_API_KEY")) {
      try {
        return Response.json({ reply: await askGemini(system, msgs, att), provider: "gemini" }, { headers: cors });
      } catch (e) {
        errors.push(`gemini: ${e?.message || e}`);
      }
    }

    return Response.json(
      { error: errors.length ? errors.join(" | ") : "Noben AI ključ ni nastavljen (ANTHROPIC_API_KEY ali GEMINI_API_KEY)." },
      { status: 500, headers: cors },
    );
  } catch (e) {
    return Response.json({ error: String(e?.message || e) }, { status: 500, headers: cors });
  }
});
