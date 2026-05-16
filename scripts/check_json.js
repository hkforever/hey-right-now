import fs from 'fs';
try {
  const data = JSON.parse(fs.readFileSync('exercises_bilingual_complete.json', 'utf8'));
  console.log('Success: JSON is valid. Count:', data.length);
} catch (err) {
  console.error('Error: JSON is invalid:', err.message);
}
