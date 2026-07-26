const fs = require('fs');
const path = 'src/app/index.tsx';
let code = fs.readFileSync(path, 'utf8');

// Add import
if (!code.includes('import { useTheme }')) {
  code = code.replace(
    /import \{ useAuth \} from '\.\.\/context\/AuthContext';/,
    "import { useAuth } from '../context/AuthContext';\nimport { useTheme } from '../context/ThemeContext';"
  );
}

// Add hooks
code = code.replace(
  /const \{ user, loading \} = useAuth\(\);/,
  "const { user, loading } = useAuth();\n  const { theme, colors } = useTheme();\n  const styles = createStyles(colors);"
);

// Replace styles references
code = code.replace(/const styles = StyleSheet\.create\(\{/, 'const createStyles = (colors: any) => StyleSheet.create({');

// Replace hardcoded colors with colors.*
code = code.replace(/backgroundColor: '#051424', \/\/ splash-bg dark stop/g, 'backgroundColor: colors.background,');
code = code.replace(/backgroundColor: 'rgba\(59, 167, 214, 0\.15\)', \/\/ primary-container with low opacity/g, "backgroundColor: 'rgba(59, 167, 214, 0.15)',");
code = code.replace(/backgroundColor: 'rgba\(18, 33, 49, 0\.5\)', \/\/ surface-container\/50/g, 'backgroundColor: colors.surfaceContainer,');
code = code.replace(/borderColor: 'rgba\(62, 72, 78, 0\.3\)', \/\/ outline-variant\/30/g, 'borderColor: colors.border,');
code = code.replace(/color: '#d4e4fa', \/\/ on-surface/g, 'color: colors.text,');
code = code.replace(/backgroundColor: '#3ba7d6', \/\/ primary-container/g, 'backgroundColor: colors.primary,');
code = code.replace(/color: '#00394d', \/\/ on-primary-container/g, 'color: colors.onPrimary,');
code = code.replace(/color: '#bec8cf', \/\/ on-surface-variant/g, 'color: colors.textDim,');
code = code.replace(/backgroundColor: '#1c2b3c', \/\/ surface-container-high/g, 'backgroundColor: colors.surfaceContainerHigh,');
code = code.replace(/backgroundColor: '#76d1ff', \/\/ primary/g, 'backgroundColor: colors.primary,');
code = code.replace(/color: '#889299', \/\/ outline/g, 'color: colors.iconDefault,');
code = code.replace(/color="#76d1ff"/g, 'color={colors.primary}');

fs.writeFileSync(path, code);
console.log('Fixed index.tsx');
