"use server";

import { TREND_BIBLE_2026 } from '../lib/trends';

const API_KEY = process.env.GROQ_API_KEY;
const MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

export async function analyzeOutfit(formData: FormData) {
  try {
    const base64Image = formData.get('image') as string;
    const wardrobeItemsJson = formData.get('wardrobe') as string || "[]";
    const preferredStyle = formData.get('style') as string || "baggy";
    
    const wardrobeItems = JSON.parse(wardrobeItemsJson);
    const trendContext = TREND_BIBLE_2026.styles[preferredStyle as keyof typeof TREND_BIBLE_2026.styles];
    
    const wardrobeContext = wardrobeItems.length > 0 
      ? `Zde je můj šatník:\n${wardrobeItems.map((i: any) => `- ${i.name} (${i.category})`).join("\n")}`
      : "Šatník je zatím prázdný.";

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Jsi PŘÍSNÝ módní diagnostik. Hodnotíš outfit podle trendů roku 2026.
                Uživatel si zvolil módní směr: ${trendContext.name}.
                Zaměření tohoto stylu: ${trendContext.focus}.
                
                Dnešní trendy (Fashion Bible 2026):
                - Barvy: ${TREND_BIBLE_2026.global_trends.colors.join(", ")}
                - Detaily: ${TREND_BIBLE_2026.global_trends.details.join(", ")}
                
                Tvá analýza musí být NEKOMPROMISNÍ. Pokud outfit neodpovídá zvolenému směru (${preferredStyle}), dej nízké skóre a v ROASTU ho pořádně setři. Pokud má v šatníku něco lepšího, navrhni to.
                
                ${wardrobeContext}

                Tvá odpověď musí být POUZE čistý JSON v češtině. 
                Struktura:
                {
                  "score": (0-100),
                  "vibe": "styl",
                  "analysis": "komentář",
                  "roast": "vtipný a krutý stěr",
                  "diagnostics": { "hlava": 0-100, "torzo": 0-100, "ruce": 0-100, "nohy": 0-100, "boty": 0-100 },
                  "specific_additions": ["obecný tip 1", "obecný tip 2"],
                  "wardrobe_suggestions": ["NÁZEV kousku ze šatníku"]
                }`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        response_format: { type: "json_object" },
      }),
    });

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    return { error: "Spojení s AI selhalo." };
  }
}

export async function categorizeItem(formData: FormData) {
  try {
    const base64Image = formData.get('image') as string;
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyzuj tento kus oblečení pro šatník 2026. Odpověz POUZE JSONem:
                {
                  "category": "Tričko" | "Kalhoty" | "Boty" | "Mikina" | "Bunda" | "Doplněk",
                  "vibe": "např. Streetwear, Elegantní, Gorpcore",
                  "color": "barva",
                  "name": "výstižný název"
                }`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        response_format: { type: "json_object" },
      }),
    });

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    return { error: "Kategorizace selhala." };
  }
}

export async function generateDailyOutfit(formData: FormData) {
  try {
    const wardrobeItemsJson = formData.get('wardrobe') as string || "[]";
    const targetVibe = formData.get('vibe') as string;
    const preferredStyle = formData.get('style') as string || "baggy";
    
    const wardrobeItems = JSON.parse(wardrobeItemsJson);
    const trendContext = TREND_BIBLE_2026.styles[preferredStyle as keyof typeof TREND_BIBLE_2026.styles];
    
    const itemsDescription = wardrobeItems.map((item: any) => `- [${item.id}] ${item.name} (${item.category}, ${item.vibe}, ${item.color})`).join("\n");

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "user",
            content: `Jsi módní stylista pro rok 2026. Máš k dispozici tento šatník:\n${itemsDescription}\n\nVytvoř nejlepší outfit pro vibe: "${targetVibe}".
            Uživatel preferuje styl: ${trendContext.name}.
            Pravidla stylu: ${trendContext.focus}.
            Aktuální trendy 2026: ${TREND_BIBLE_2026.global_trends.colors.join(", ")}.
            
            Sestav outfit, který je PŘÍSNĚ v tomto stylu. Odpověz POUZE JSONem. 
            DŮLEŽITÉ: V polích 'title' a 'reasoning' NIKDY neuváděj ID kousků (ty kódy v závorkách). Používej tam jen lidské názvy.
            
            Struktura:
            {
              "title": "název",
              "reasoning": "stylistický rozbor",
              "selectedIds": ["id1", "id2"],
              "styleTip": "tip"
            }`
          }
        ],
        response_format: { type: "json_object" },
      }),
    });

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    return { error: "Generování selhalo." };
  }
}