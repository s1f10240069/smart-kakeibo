import { readFileSync, writeFileSync } from 'fs';
let content = readFileSync('src/App.jsx', 'utf8');

// Replace the GitHub token input section - using regex to avoid encoding issues
// We want to add showGhToken toggle to the password input that's inside the cloud sync card
content = content.replace(
  /type="password" \n(\s+)placeholder="ghp_xxxx\.\.\."\n(\s+)value=\{githubToken\}\n(\s+)onChange=\{e => setGithubToken\(e\.target\.value\)\}\n(\s+)style=\{\{flex:1, border:'none', background:'transparent', outline:'none', fontSize:'14px', color:'var\(--text-primary\)', width: '100%'\}\}\n(\s+)\/>\n(\s+)<\/div>/,
  (match, s1, s2, s3, s4, s5, s6) => {
    console.log('MATCH FOUND');
    return `type={showGhToken ? 'text' : 'password'} \n${s1}placeholder="ghp_xxxx..."\n${s2}value={githubToken}\n${s3}onChange={e => setGithubToken(e.target.value)}\n${s4}style={{flex:1, border:'none', background:'transparent', outline:'none', fontSize:'14px', color:'var(--text-primary)', width: '100%'}}\n${s5}/>\n${s5}<div onClick={() => setShowGhToken(!showGhToken)} style={{padding: '0 5px', color:'var(--text-secondary)', cursor:'pointer'}}>\n${s5}   {showGhToken ? <EyeOff size={18} /> : <Eye size={18} />}\n${s5}</div>\n${s6}</div>`;
  }
);

if (!content.includes('showGhToken ? <EyeOff')) {
  console.log('Regex did not match - trying plain string replacement');
  // Try index-based approach
  const lines = content.split('\n');
  let fixedLines = [];
  let inBlock = false;
  for (let i = 0; i < lines.length; i++) {
    fixedLines.push(lines[i]);
    // Detect the githubToken password input closing
    if (lines[i].includes('setGithubToken') && lines[i+1] && lines[i+1].includes("style={{flex:1") && lines[i+2] && lines[i+2].includes("/>")) {
      console.log('Index-based match at line', i);
      // The />, </div> needs eye button inserted
      fixedLines.push(lines[i+1]); // style line
      fixedLines.push(lines[i+2]); // />
      fixedLines.push("                     <div onClick={() => setShowGhToken(!showGhToken)} style={{padding: '0 5px', color:'var(--text-secondary)', cursor:'pointer'}}>");
      fixedLines.push("                        {showGhToken ? <EyeOff size={18} /> : <Eye size={18} />}");
      fixedLines.push("                     </div>");
      i += 2; // skip the ones we already added
    }
  }
  content = fixedLines.join('\n');
}

// Also ensure type is dynamic for the token input
content = content.replace(
  /type="password" \n(\s+)placeholder="ghp_xxxx\.\.\."/,
  "type={showGhToken ? 'text' : 'password'} \n$1placeholder=\"ghp_xxxx...\""
);

writeFileSync('src/App.jsx', content, 'utf8');
console.log('Done');
