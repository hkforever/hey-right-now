import fs from 'fs';
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from 'dotenv';

dotenv.config();

const SOURCE_FILE = 'exercises_cn.json';
const TARGET_FILE = 'exercises_bilingual_complete.json';
const BATCH_SIZE = 5;
const MAX_BATCHES = 2; // Increase this to translate more in one go

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

async function translateBatch(exercises: any[]) {
  const prompt = `You are a professional fitness translator. Translate the following workout exercises from English to natural, professional fitness Chinese (Simplified).
Keep the IDs and structure. Only translate text fields.

Instructions:
1. Provide a professional Chinese name.
2. Provide a clear, localized Chinese instruction paragraph.
3. Provide step-by-step points in Chinese.
4. Use standard terminology (e.g., use '自重' for 'body weight', '仰卧' for 'lie on your back', etc.).

Input JSON:
${JSON.stringify(exercises.map(e => ({
    id: e.id,
    name_en: e.name.en,
    instructions_en: e.instructions.en,
    steps_en: e.instruction_steps.en,
    category_en: e.category.en,
    body_part_en: e.body_part.en,
    equipment_en: e.equipment.en,
    target_en: e.target.en,
    muscle_group_en: e.muscle_group.en,
    secondary_muscles_en: e.secondary_muscles.map((m: any) => m.en)
})), null, 2)}

Return the translations in a JSON array matching the order.
Format:
[
  {
    "id": "...",
    "name_zh": "...",
    "instructions_zh": "...",
    "steps_zh": ["...", "..."],
    "category_zh": "...",
    "body_part_zh": "...",
    "equipment_zh": "...",
    "target_zh": "...",
    "muscle_group_zh": "...",
    "secondary_muscles_zh": ["...", "..."]
  }
]`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name_zh: { type: Type.STRING },
              instructions_zh: { type: Type.STRING },
              steps_zh: { type: Type.ARRAY, items: { type: Type.STRING } },
              category_zh: { type: Type.STRING },
              body_part_zh: { type: Type.STRING },
              equipment_zh: { type: Type.STRING },
              target_zh: { type: Type.STRING },
              muscle_group_zh: { type: Type.STRING },
              secondary_muscles_zh: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["id", "name_zh", "instructions_zh", "steps_zh", "category_zh", "body_part_zh", "equipment_zh", "target_zh", "muscle_group_zh", "secondary_muscles_zh"]
          }
        }
      }
    });

    const results = JSON.parse(response.text);
    return results;
  } catch (error) {
    console.error("Translation error:", error);
    return [];
  }
}

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY not found in .env");
    return;
  }

  const sourceData = JSON.parse(fs.readFileSync(SOURCE_FILE, 'utf8'));
  let targetData = [];
  if (fs.existsSync(TARGET_FILE)) {
    targetData = JSON.parse(fs.readFileSync(TARGET_FILE, 'utf8'));
  }

  const existingIds = new Set(targetData.map((e: any) => e.id));
  const toTranslate = sourceData.filter((e: any) => !existingIds.has(e.id));

  console.log(`Found ${toTranslate.length} exercises remaining.`);
  if (toTranslate.length === 0) {
    console.log("All exercises are already translated!");
    return;
  }

  const batches = Math.min(Math.ceil(toTranslate.length / BATCH_SIZE), MAX_BATCHES);

  for (let i = 0; i < batches; i++) {
    const start = i * BATCH_SIZE;
    const end = start + BATCH_SIZE;
    const currentBatch = toTranslate.slice(start, end);

    console.log(`Translating batch ${i + 1}/${batches} (${currentBatch.length} items)...`);
    const translatedResults = await translateBatch(currentBatch);

    if (translatedResults.length > 0) {
      for (const t of translatedResults) {
        const original = currentBatch.find(o => o.id === t.id);
        if (original) {
          const newExercise = {
            ...original,
            name: { en: original.name.en, zh: t.name_zh },
            category: { en: original.category.en, zh: t.category_zh },
            body_part: { en: original.body_part.en, zh: t.body_part_zh },
            equipment: { en: original.equipment.en, zh: t.equipment_zh },
            target: { en: original.target.en, zh: t.target_zh },
            muscle_group: { en: original.muscle_group.en, zh: t.muscle_group_zh },
            secondary_muscles: original.secondary_muscles.map((m: any, idx: number) => ({
              en: m.en,
              zh: t.secondary_muscles_zh[idx] || m.en
            })),
            instructions: { en: original.instructions.en, zh: t.instructions_zh },
            instruction_steps: { en: original.instruction_steps.en, zh: t.steps_zh }
          };
          targetData.push(newExercise);
        }
      }

      // Save progress after each batch
      fs.writeFileSync(TARGET_FILE, JSON.stringify(targetData, null, 2));
      console.log(`Saved progress. Total: ${targetData.length}`);
    }
  }

  // Update preview file too (first 50)
  const previewData = targetData.slice(0, 50);
  fs.writeFileSync('exercises_bilingual_preview.json', JSON.stringify(previewData, null, 2));
  
  console.log("Done for now! Run the script again to continue.");
}

main();
