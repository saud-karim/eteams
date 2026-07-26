const fs = require('fs');

function refactorFile(path) {
  let code = fs.readFileSync(path, 'utf8');

  // Add import
  if (!code.includes('import { useTheme }')) {
    code = code.replace(
      "import { useRouter",
      "import { useTheme } from '../../context/ThemeContext';\nimport { useRouter"
    );
  }

  // Add useTheme inside component
  if (!code.includes('const { theme, colors } = useTheme();')) {
    code = code.replace(
      "const { user } = useAuth();",
      "const { user } = useAuth();\n  const { theme, colors } = useTheme();\n  const styles = createStyles(colors);"
    );
  }

  // Find StyleSheet.create
  if (code.includes('const styles = StyleSheet.create({')) {
    let stylesPart = code.substring(code.indexOf('const styles = StyleSheet.create({'));
    stylesPart = stylesPart.replace('const styles = StyleSheet.create({', 'const createStyles = (colors: any) => StyleSheet.create({');

    // Theme replacements
    stylesPart = stylesPart.replace(/#051424/g, 'colors.background');
    stylesPart = stylesPart.replace(/#0F172A/g, 'colors.composerBg');
    stylesPart = stylesPart.replace(/#1E293B/g, 'colors.surfaceContainer');
    stylesPart = stylesPart.replace(/#3BA7D6/g, 'colors.primary');
    stylesPart = stylesPart.replace(/#003548/g, 'colors.onPrimary');
    stylesPart = stylesPart.replace(/#F8FAFC/g, 'colors.text');
    stylesPart = stylesPart.replace(/#d4e4fa/g, 'colors.text');
    stylesPart = stylesPart.replace(/#bec8cf/g, 'colors.textDim');
    stylesPart = stylesPart.replace(/#889299/g, 'colors.iconDefault');
    stylesPart = stylesPart.replace(/#273647/g, 'colors.surfaceContainerHigh');
    stylesPart = stylesPart.replace(/rgba\(136, 146, 153, 0\.2\)/g, 'colors.border');
    stylesPart = stylesPart.replace(/#E8EEF5/g, 'colors.text');
    stylesPart = stylesPart.replace(/#10B981/g, 'colors.secondary');

    code = code.substring(0, code.indexOf('const styles = StyleSheet.create({')) + stylesPart;
  }

  // JSX inline colors
  code = code.replace(/color="#051424"/g, 'color={colors.background}');
  code = code.replace(/color="#3BA7D6"/g, 'color={colors.primary}');
  code = code.replace(/color="#E8EEF5"/g, 'color={colors.text}');
  code = code.replace(/color="#889299"/g, 'color={colors.iconDefault}');
  code = code.replace(/color="#94A3B8"/g, 'color={colors.textDim}');
  code = code.replace(/color={channel\.unread_count > 0 \? '#E8EEF5' : '#889299'}/g, "color={channel.unread_count > 0 ? colors.text : colors.iconDefault}");

  fs.writeFileSync(path, code);
  console.log('Done ' + path);
}

refactorFile('src/app/(tabs)/index.tsx');
