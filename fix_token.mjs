import { readFileSync, writeFileSync } from 'fs';
let content = readFileSync('src/App.jsx', 'utf8');

// Add multiple attribute to all CSV file inputs
let count = 0;
content = content.replace(/accept="\.csv" onChange=\{handleFileUpload\}/g, (match) => {
  count++;
  return 'accept=".csv" multiple onChange={handleFileUpload}';
});
console.log(`Added multiple to ${count} file inputs`);

writeFileSync('src/App.jsx', content, 'utf8');
console.log('Done');
