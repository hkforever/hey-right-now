import { GoogleGenAI } from "@google/genai";
import fs from "fs";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: "加油，开始下一组训练！" }] }],
      config: {
        responseModalities: ["AUDIO"] as any,
        speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
        },
      },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      console.log("Audio generated, length:", base64Audio.length);
      fs.writeFileSync("test.txt", base64Audio.substring(0, 100));
    } else {
        console.log("No audio generated.")
    }
  } catch (e) {
    console.error(e);
  }
}
run();
