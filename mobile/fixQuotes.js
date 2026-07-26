const fs = require('fs');
const files = ['src/app/settings.tsx', 'src/app/chat/[id].tsx', 'src/app/(tabs)/index.tsx', 'src/app/(tabs)/_layout.tsx'];

files.forEach(file => {
  let code = fs.readFileSync(file, 'utf8');
  
  // Fix single quotes around colors.something
  code = code.replace(/'(colors\.[a-zA-Z0-9_]+)'/g, '$1');
  
  // also, in index.tsx, there are some remaining hardcoded borders like rgba(136, 146, 153, 0.1) that make it look like a notebook.
  code = code.replace(/'rgba\(136, 146, 153, 0\.1\)'/g, 'colors.border');
  code = code.replace(/'rgba\(39, 54, 71, 0\.3\)'/g, 'colors.surfaceContainer');
  code = code.replace(/backgroundColor: 'rgba\(39, 54, 71, 0\.3\)'/g, 'backgroundColor: colors.surfaceContainer');
  
  fs.writeFileSync(file, code);
  console.log('Fixed ' + file);
});
