
import fs from 'fs';
const data = JSON.parse(fs.readFileSync('exercises.json', 'utf8'));
const duplicates = data.filter(ex => (ex.name?.zh || ex.name?.en) === '悬垂举腿' && (ex.equipment?.zh || ex.equipment?.en) === '自重');
console.log(JSON.stringify(duplicates, null, 2));
