import fs from 'fs';

const data = JSON.parse(fs.readFileSync('exercises.json', 'utf8'));

const groups = {};

data.forEach(ex => {
  const name = ex.name?.zh || ex.name?.en || '';
  const equipment = ex.equipment?.zh || ex.equipment?.en || '';
  const key = `${name}_${equipment}`;
  
  if (!groups[key]) {
    groups[key] = [];
  }
  groups[key].push(ex);
});

const duplicates = {};
let countRemoved = 0;
for (const key in groups) {
  if (groups[key].length > 1) {
    duplicates[key] = groups[key].map(ex => ({
      id: ex.id,
      name_en: ex.name?.en,
      name_zh: ex.name?.zh,
      equipment: ex.equipment?.zh || ex.equipment?.en,
    }));
    countRemoved += groups[key].length - 1;
  }
}

console.log(JSON.stringify(duplicates, null, 2));
console.log(`Total removed duplicates due to name_equipment collision: ${countRemoved}`);
