const fs = require('fs');
let code = fs.readFileSync('src/app/settings.tsx', 'utf8');

// 1. Add imports
code = code.replace(
  "import { useSafeAreaInsets } from 'react-native-safe-area-context';",
  "import { useSafeAreaInsets } from 'react-native-safe-area-context';\nimport { useTheme } from '../context/ThemeContext';\nimport { Alert } from 'react-native';"
);

// 2. Add useTheme inside component and handle toggle
code = code.replace(
  "const insets = useSafeAreaInsets();",
  "const insets = useSafeAreaInsets();\n  const { theme, colors, setThemeSetting } = useTheme();\n  const styles = createStyles(colors);\n\n  const toggleTheme = () => {\n    Alert.alert('Theme', 'Choose Appearance', [\n      { text: 'Light', onPress: () => setThemeSetting('light') },\n      { text: 'Dark', onPress: () => setThemeSetting('dark') },\n      { text: 'Cancel', style: 'cancel' }\n    ]);\n  };\n"
);

// 3. Update Appearance onPress and label
code = code.replace(
  "<TouchableOpacity style={styles.settingItem}>",
  "<TouchableOpacity style={styles.settingItem} onPress={toggleTheme}>"
);
code = code.replace(
  "<Text style={styles.settingSubtitle}>Vibrant Dark Mode</Text>",
  "<Text style={styles.settingSubtitle}>{theme === 'dark' ? 'Vibrant Dark Mode' : 'Clean Light Mode'}</Text>"
);

// 4. Wrap styles and replace colors
let stylesPart = code.substring(code.indexOf('const styles = StyleSheet.create({'));
stylesPart = stylesPart.replace('const styles = StyleSheet.create({', 'const createStyles = (colors: any) => StyleSheet.create({');

// Replace colors in styles
stylesPart = stylesPart.replace(/#0E1218/g, 'colors.background');
stylesPart = stylesPart.replace(/#0B1A2A/g, 'colors.surface');
stylesPart = stylesPart.replace(/#1E293B/g, 'colors.surfaceContainer');
stylesPart = stylesPart.replace(/#3BA7D6/g, 'colors.primary');
stylesPart = stylesPart.replace(/#003548/g, 'colors.onPrimary');
stylesPart = stylesPart.replace(/#F8FAFC/g, 'colors.text');
stylesPart = stylesPart.replace(/#bec8cf/g, 'colors.textDim');
stylesPart = stylesPart.replace(/#273647/g, 'colors.surfaceContainerHigh');
stylesPart = stylesPart.replace(/#76D1FF/g, 'colors.primary');
stylesPart = stylesPart.replace(/rgba\(118, 209, 255, 0\.15\)/g, 'colors.border');
stylesPart = stylesPart.replace(/rgba\(118, 209, 255, 0\.1\)/g, 'colors.border');
stylesPart = stylesPart.replace(/rgba\(118, 209, 255, 0\.05\)/g, 'colors.border');

code = code.substring(0, code.indexOf('const styles = StyleSheet.create({')) + stylesPart;

fs.writeFileSync('src/app/settings.tsx', code);
console.log('Done');
