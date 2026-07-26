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

function processFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  let code = fs.readFileSync(filePath, 'utf8');

  // Skip if already processed
  if (code.includes('import { useTheme }')) return;

  // Calculate relative path to ThemeContext
  const depth = filePath.split('/').length - 3; // e.g. src/app/notifications.tsx -> depth 0
  let relativePath = '';
  if (depth === 0) relativePath = '../context/ThemeContext';
  else if (depth === 1) relativePath = '../../context/ThemeContext';
  else if (depth === 2) relativePath = '../../../context/ThemeContext';

  code = code.replace(
    /import.*?(?:react-native|expo-router|react).*?;/m,
    match => match + `\nimport { useTheme } from '${relativePath}';`
  );

  // Add useTheme inside default export component
  code = code.replace(
    /(export default function [A-Za-z0-9_]+\(.*?\)\s*\{)/,
    `$1\n  const { theme, colors } = useTheme();\n  const styles = createStyles(colors);`
  );

  // Convert StyleSheet.create
  if (code.includes('const styles = StyleSheet.create({')) {
    let stylesPart = code.substring(code.indexOf('const styles = StyleSheet.create({'));
    let beforeStyles = code.substring(0, code.indexOf('const styles = StyleSheet.create({'));
    
    stylesPart = stylesPart.replace('const styles = StyleSheet.create({', 'const createStyles = (colors: any) => StyleSheet.create({');

    // Replace color codes
    const colorMap = {
      '#0E1218': 'colors.background',
      '#051424': 'colors.background',
      '#0B1A2A': 'colors.surface',
      '#1E293B': 'colors.surfaceContainer',
      '#1c2b3c': 'colors.surfaceContainerHigh',
      '#0F172A': 'colors.composerBg',
      '#3BA7D6': 'colors.primary',
      '#76D1FF': 'colors.primary',
      '#003548': 'colors.onPrimary',
      '#F8FAFC': 'colors.text',
      '#E8EEF5': 'colors.text',
      '#d4e4fa': 'colors.text',
      '#bec8cf': 'colors.textDim',
      '#94A3B8': 'colors.iconDefault',
      '#889299': 'colors.iconDefault',
      '#64748B': 'colors.textDim',
      '#273647': 'colors.surfaceContainerHigh',
      'rgba\\(118, 209, 255, 0\\.15\\)': 'colors.border',
      'rgba\\(118, 209, 255, 0\\.1\\)': 'colors.border',
      'rgba\\(118, 209, 255, 0\\.05\\)': 'colors.border',
      'rgba\\(136, 146, 153, 0\\.1\\)': 'colors.border',
      'rgba\\(39, 54, 71, 0\\.3\\)': 'colors.surfaceContainer',
      'rgba\\(15, 23, 42, 0\\.95\\)': 'colors.background',
      'rgba\\(244, 63, 94, 0\\.1\\)': 'colors.surfaceContainer',
      'rgba\\(244, 63, 94, 0\\.3\\)': 'colors.border',
      '#EF4444': 'colors.error',
      '#10B981': 'colors.secondary',
      '#ffb4ab': 'colors.error',
      '#4ae176': 'colors.secondary',
      '#F43F5E': 'colors.error', // pinkish red
      '#22C55E': 'colors.secondary', // green
      '#F59E0B': 'colors.primary' // amber/orange fallback to primary
    };

    for (const [hex, variable] of Object.entries(colorMap)) {
      const regex = new RegExp(`'${hex}'`, 'gi');
      stylesPart = stylesPart.replace(regex, variable);
    }
    
    code = beforeStyles + stylesPart;
  }

  // Handle inline JSX colors 
  code = code.replace(/color=['"]#(?:3BA7D6|76D1FF|F59E0B)['"]/gi, 'color={colors.primary}');
  code = code.replace(/color=['"]#(?:F8FAFC|E8EEF5|d4e4fa)['"]/gi, 'color={colors.text}');
  code = code.replace(/color=['"]#(?:bec8cf|94A3B8|889299|64748B)['"]/gi, 'color={colors.iconDefault}');
  code = code.replace(/color=['"]#(?:0E1218|051424)['"]/gi, 'color={colors.background}');
  code = code.replace(/placeholderTextColor=['"]#(?:bec8cf|94A3B8|889299|64748B)['"]/gi, 'placeholderTextColor={colors.iconDefault}');

  fs.writeFileSync(filePath, code);
  console.log(`Refactored ${filePath}`);
}

filesToProcess.forEach(processFile);
