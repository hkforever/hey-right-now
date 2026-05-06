import fs from "fs";
import https from "https";

const texts = [
  "加油，开始下一组训练！",
  "休息结束，准备下一组，继续努力！",
  "时间到！调整呼吸，准备出击！",
  "马上开始下一组，别放松！",
  "休息够了吗？该继续变强了哦！",
  "下一组准备，挑战自己的极限吧！",
  "倒计时结束，让我们继续挥洒汗水！",
  "专注精神，马上进入下一组！",
];

async function download(text: string, index: number) {
  const url = `https://translate.googleapis.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=zh-CN&client=tw-ob`;
  return new Promise<string>((resolve, reject) => {
    https.get(url, (res) => {
      const chunks: any[] = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const buffer = Buffer.concat(chunks);
        resolve(`data:audio/mpeg;base64,${buffer.toString("base64")}`);
      });
    }).on("error", reject);
  });
}

async function run() {
  const results: string[] = [];
  for (let i = 0; i < texts.length; i++) {
    const b64 = await download(texts[i], i);
    results.push(`  "${b64}"`);
    console.log(`Downloaded ${i + 1}`);
  }
  
  const content = `export const voicePrompts = [
${results.join(',\n')}
];`;

  fs.writeFileSync("src/lib/voicePrompts.ts", content);
  console.log("Done.");
}

run();
