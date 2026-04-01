const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

// Fix: Add eye toggle to GitHub token input
const oldPattern = /type="password" \n                       placeholder="ghp_xxxx\.\.\."/;

// Find lines around githubToken in settings section and add eye button
const searchStr = 'onChange={e => setGithubToken(e.target.value)}\n                       style={{flex:1, border:\'none\', background:\'transparent\', outline:\'none\', fontSize:\'14px\', color:\'var(--text-primary)\', width: \'100%\'}}\n                     />\n                  </div>';

const replaceStr = `onChange={e => setGithubToken(e.target.value)}
                       style={{flex:1, border:'none', background:'transparent', outline:'none', fontSize:'14px', color:'var(--text-primary)', width: '100%'}}
                     />
                     <div onClick={() => setShowGhToken(!showGhToken)} style={{padding: '0 5px', color:'var(--text-secondary)', cursor:'pointer'}}>
                        {showGhToken ? <EyeOff size={18} /> : <Eye size={18} />}
                     </div>
                  </div>`;

if (content.includes(searchStr)) {
  content = content.replace(searchStr, replaceStr);
  console.log('✅ Eye button fix applied!');
} else {
  // Try finding the token input block in a different way
  const idx = content.indexOf('githubToken}');
  console.log('githubToken} found at:', idx);
  console.log('Context:', JSON.stringify(content.substring(idx - 100, idx + 300)));
}

fs.writeFileSync('src/App.jsx', content, 'utf8');
console.log('Done.');
