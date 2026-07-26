const fs = require('fs');

function refactorFile(path) {
  let code = fs.readFileSync(path, 'utf8');

  // Add import
  if (!code.includes('import { useTheme }')) {
    code = code.replace(
      "import { Colors } from '@/constants/Colors';",
      "import { Colors } from '@/constants/Colors';\nimport { useTheme } from '../../context/ThemeContext';"
    );
  }

  // Add useTheme inside CustomTabBar
  if (!code.includes('const { theme, colors } = useTheme();')) {
    code = code.replace(
      "const insets = useSafeAreaInsets();",
      "const insets = useSafeAreaInsets();\n  const { theme, colors } = useTheme();\n  const styles = createStyles(colors);"
    );
  }

  // Find StyleSheet.create
  if (code.includes('const styles = StyleSheet.create({')) {
    let stylesPart = code.substring(code.indexOf('const styles = StyleSheet.create({'));
    stylesPart = stylesPart.replace('const styles = StyleSheet.create({', 'const createStyles = (colors: any) => StyleSheet.create({');

    // Theme replacements
    stylesPart = stylesPart.replace(/#0A1726/g, 'colors.background');
    stylesPart = stylesPart.replace(/rgba\(118, 209, 255, 0\.15\)/g, 'colors.border');
    stylesPart = stylesPart.replace(/#bec8cf/g, 'colors.textDim');
    stylesPart = stylesPart.replace(/#3BA7D6/g, 'colors.primary');

    code = code.substring(0, code.indexOf('const styles = StyleSheet.create({')) + stylesPart;
  }

  // Replace colors in JSX of CustomTabBar
  code = code.replace(/color={isFocused \? '#76D1FF' : '#889299'}/g, "color={isFocused ? colors.primary : colors.iconDefault}");

  fs.writeFileSync(path, code);
  console.log('Done ' + path);
}

refactorFile('src/app/(tabs)/_layout.tsx');
