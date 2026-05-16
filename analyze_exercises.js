
import fs from 'fs';

const data = JSON.parse(fs.readFileSync('exercises.json', 'utf8'));

const mapApiCategory = (c, b) => {
  const cat = String(c || '').toLowerCase();
  const body = String(b || '').toLowerCase();
  const combined = `${cat} ${body}`;
  if (combined.includes('cardio')) return '心肺训练';
  return '其他';
};

const mapMuscleTranslation = (m) => {
  return '某个肌肉';
};

const processed = data.map(ex => {
  const name = ex.name?.zh || ex.name?.en || ex.name || '';
  const equipment = ex.equipment?.zh || ex.equipment?.en || ex.equipment || '其他';
  return { name, equipment };
});

const map = new Map();
processed.forEach(ex => {
  const key = `${ex.name}_${ex.equipment}`;
  if (map.has(key)) {
    map.get(key).push(ex);
  } else {
    map.set(key, [ex]);
  }
});

console.log('Total exercises in JSON:', data.length);
console.log('Unique pairs (Name + Equipment):', map.size);
console.log('Duplicates count:', data.length - map.size);

// Print some duplicates
let count = 0;
for (const [key, list] of map) {
  if (list.length > 1) {
    console.log(`Duplicate Key: [${key}] - Count: ${list.length}`);
    count++;
    if (count > 5) break;
  }
}
