const fs = require('fs');

const filesToProcess = [
  'src/app/(tabs)/dms.tsx',
  'src/app/(tabs)/activity.tsx',
  'src/app/(tabs)/profile.tsx',
  'src/app/notifications.tsx',
  'src/app/thread/[id].tsx',
  'src/app/(auth)/login.tsx',
  'src/app/(auth)/register.tsx',
  'src/app/(auth)/onboarding.tsx'
];

filesToProcess.forEach(file => {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, 'utf8');
  
  // Fix single quotes around colors.something
  code = code.replace(/'(colors\.[a-zA-Z0-9_]+)'/g, '$1');
  
  fs.writeFileSync(file, code);
  console.log('Fixed quotes in ' + file);
});
