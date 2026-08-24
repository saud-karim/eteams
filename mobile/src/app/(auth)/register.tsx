import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, TextInput, KeyboardAvoidingView, Platform, ScrollView, Modal, FlatList, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../api/client';


const DEPARTMENTS = [
  'Engineering', 'Product', 'Marketing', 'Sales', 'HR', 'Finance', 
  'Executive', 'Customer Support', 'IT', 'Operations', 'Legal', 'Other'
];

const EMPLOYMENT_TYPES = [
  'Full-time employee', 'Part-time employee', 'Consultant', 'Intern', 'Vendor'
];

export default function RegisterScreen() {
  const { theme, colors, setThemeSetting } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const styles = createStyles(colors, insets, width, height);
  const router = useRouter();
  const { t, i18n } = useTranslation();
  
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [employmentType, setEmploymentType] = useState('Full-time employee');
  const [reportsTo, setReportsTo] = useState('');
  
  const [managers, setManagers] = useState<any[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [pickerConfig, setPickerConfig] = useState({ visible: false, type: '', title: '', options: [] as any[] });

  useEffect(() => {
    api.auth.getManagers().then((res: any) => {
      if (res.managers) setManagers(res.managers);
    }).catch(err => console.log('Could not load managers', err));
  }, []);

  const handleRegister = async () => {
    if (!name || !username || !password) {
      setErrorMsg(t('auth.fill_required') || 'Please fill out required fields');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    
    const data: any = {
      name,
      username,
      password,
      employment_type: employmentType,
    };
    if (department) data.department = department;
    if (reportsTo) data.reports_to = reportsTo;

    try {
      const res: any = await api.auth.signup(data);
      setSuccessMsg(res.message || 'Signup successful. Pending admin approval.');
      setTimeout(() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(auth)/login');
        }
      }, 3000);
    } catch (err: any) {
      let errMsg = err.message || 'Registration failed';
      try {
        if (errMsg.startsWith('[') && errMsg.endsWith(']')) {
          const parsed = JSON.parse(errMsg);
          if (Array.isArray(parsed) && parsed[0]?.message) {
            errMsg = parsed.map(e => e.message).join('\\n');
          }
        }
      } catch (e) {
        // Not a JSON array, leave it as is
      }
      setErrorMsg(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const openPicker = (type: string) => {
    if (type === 'department') {
      setPickerConfig({ visible: true, type, title: 'Select Department', options: DEPARTMENTS.map(d => ({ label: d, value: d })) });
    } else if (type === 'employment') {
      setPickerConfig({ visible: true, type, title: 'Select Employment Type', options: EMPLOYMENT_TYPES.map(e => ({ label: e, value: e })) });
    } else if (type === 'reportsTo') {
      const opts = [{ label: 'None', value: '' }, ...managers.map(m => ({ label: m.name, value: m.id }))];
      setPickerConfig({ visible: true, type, title: 'Select Manager', options: opts });
    }
  };

  const handleSelect = (val: string) => {
    if (pickerConfig.type === 'department') setDepartment(val);
    else if (pickerConfig.type === 'employment') setEmploymentType(val);
    else if (pickerConfig.type === 'reportsTo') setReportsTo(val);
    setPickerConfig({ ...pickerConfig, visible: false });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.blurTopRight} />
      <View style={styles.blurBottomLeft} />

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
              <MaterialIcons name="arrow-back" size={24} color={colors.textDim} style={{ transform: [{ scaleX: i18n.dir() === 'rtl' ? -1 : 1 }] }} />
              <Text style={styles.backText}>{t('common.back')}</Text>
            </TouchableOpacity>
            
            <View style={[styles.rightActions, { flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity style={styles.langButton} onPress={() => {
                const newLang = i18n.language === 'en' ? 'ar' : 'en';
                import('../../locales/i18n').then(({ changeLanguage }) => changeLanguage(newLang));
              }}>
                <MaterialIcons name="language" size={18} color={colors.textDim} />
                <Text style={styles.langText}>{i18n.language === 'en' ? 'EN' : 'AR'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.themeButton} onPress={() => setThemeSetting(theme === 'dark' ? 'light' : 'dark')}>
                <MaterialIcons name={theme === 'dark' ? 'light-mode' : 'dark-mode'} size={20} color={colors.textDim} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.glassPanel}>
            <View style={styles.logoSection}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ flexDirection: 'column', gap: 4, marginRight: 16 }}>
                  <View style={{ height: 6, width: 28, backgroundColor: '#3BA7D6', borderRadius: 4 }} />
                  <View style={{ height: 6, width: 36, backgroundColor: '#22D3EE', borderRadius: 4 }} />
                  <View style={{ height: 6, width: 22, backgroundColor: '#67E8F9', borderRadius: 4 }} />
                </View>
                
                <View style={{ 
                  flexDirection: 'row', alignItems: 'baseline',
                  backgroundColor: colors.surfaceContainerHigh, paddingVertical: 8, paddingHorizontal: 16, 
                  borderRadius: 12, borderWidth: 1, borderColor: colors.border,
                  elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8
                }}>
                  <Text style={{ color: '#3BA7D6', fontWeight: '900', fontSize: 36, lineHeight: 36 }}>E</Text>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 30, letterSpacing: 1, lineHeight: 36 }}>teams</Text>
                </View>
              </View>
              <Text style={styles.subtitle}>{t('auth.create_account')}</Text>
            </View>

            {successMsg ? (
              <View style={styles.successBox}>
                <MaterialIcons name="check-circle" size={24} color="#000" />
                <Text style={styles.successText}>{successMsg}</Text>
              </View>
            ) : (
              <View style={styles.form}>
                {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Full Name</Text>
                  <View style={styles.inputWrapper}>
                    <MaterialIcons name="account-circle" size={20} color={colors.textDim} style={styles.inputIconLeft} />
                    <TextInput
                      style={[styles.input, { textAlign: i18n.dir() === 'rtl' ? 'right' : 'left' }]}
                      placeholder="e.g. John Doe"
                      placeholderTextColor={colors.border}
                      value={name}
                      onChangeText={setName}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Username</Text>
                  <View style={styles.inputWrapper}>
                    <MaterialIcons name="person" size={20} color={colors.textDim} style={styles.inputIconLeft} />
                    <TextInput
                      style={[styles.input, { textAlign: i18n.dir() === 'rtl' ? 'right' : 'left' }]}
                      placeholder="john_doe"
                      placeholderTextColor={colors.border}
                      autoCapitalize="none"
                      value={username}
                      onChangeText={setUsername}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('auth.password')}</Text>
                  <View style={styles.inputWrapper}>
                    <MaterialIcons name="lock" size={20} color={colors.textDim} style={styles.inputIconLeft} />
                    <TextInput
                      style={[styles.input, { textAlign: i18n.dir() === 'rtl' ? 'right' : 'left' }]}
                      placeholder="••••••••"
                      placeholderTextColor={colors.border}
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                    />
                    <TouchableOpacity style={styles.inputIconRight} onPress={() => setShowPassword(!showPassword)}>
                      <MaterialIcons name={showPassword ? "visibility-off" : "visibility"} size={20} color={colors.textDim} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Department</Text>
                  <TouchableOpacity style={[styles.input, styles.pickerInput]} onPress={() => openPicker('department')}>
                    <Text style={{ color: department ? colors.text : colors.textDim }}>{department || 'Select department...'}</Text>
                    <MaterialIcons name="arrow-drop-down" size={24} color={colors.textDim} />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Employment Type</Text>
                  <TouchableOpacity style={[styles.input, styles.pickerInput]} onPress={() => openPicker('employment')}>
                    <Text style={{ color: employmentType ? colors.text : colors.textDim }}>{employmentType || 'Select...'}</Text>
                    <MaterialIcons name="arrow-drop-down" size={24} color={colors.textDim} />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Reports To</Text>
                  <TouchableOpacity style={[styles.input, styles.pickerInput]} onPress={() => openPicker('reportsTo')}>
                    <Text style={{ color: reportsTo ? colors.text : colors.textDim }}>
                      {reportsTo ? managers.find(m => m.id === reportsTo)?.name : 'Select manager...'}
                    </Text>
                    <MaterialIcons name="arrow-drop-down" size={24} color={colors.textDim} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.loginButton} onPress={handleRegister} disabled={loading}>
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.loginButtonText}>{t('auth.sign_up')}</Text>
                      <MaterialIcons name="person-add" size={20} color="#fff" />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
          
          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('auth.has_account')}</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.footerLink}> {t('auth.sign_in')}</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={pickerConfig.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{pickerConfig.title}</Text>
            <FlatList
              data={pickerConfig.options}
              keyExtractor={(item) => String(item.value)}
              style={{ maxHeight: height * 0.35 }}
              renderItem={({ item }) => {
                let isSelected = false;
                if (pickerConfig.type === 'department') isSelected = item.value === department;
                if (pickerConfig.type === 'employment') isSelected = item.value === employmentType;
                if (pickerConfig.type === 'reportsTo') isSelected = item.value === reportsTo;

                return (
                  <TouchableOpacity 
                    style={[styles.modalItem, isSelected && styles.modalItemSelected]} 
                    onPress={() => handleSelect(item.value)}
                  >
                    <Text style={[styles.modalItemText, isSelected && styles.modalItemTextSelected]}>{item.label}</Text>
                    {isSelected && <MaterialIcons name="check" size={20} color={colors.primary} />}
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setPickerConfig({ ...pickerConfig, visible: false })}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const createStyles = (colors: typeof Colors.light, insets: any, width: number, height: number) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  blurTopRight: {
    position: 'absolute',
    top: -height * 0.1,
    right: -width * 0.2,
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: 9999,
    backgroundColor: 'rgba(118, 209, 255, 0.08)', 
  },
  blurBottomLeft: {
    position: 'absolute',
    bottom: -height * 0.1,
    left: -width * 0.2,
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: 9999,
    backgroundColor: 'rgba(74, 225, 118, 0.04)', 
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    paddingTop: 70,
    paddingBottom: 16,
  },
  topBar: {
    position: 'absolute',
    top: insets.top > 0 ? insets.top + 16 : 24,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    ...Typography.bodyMd,
    color: colors.textDim,
    marginLeft: 4,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  langText: {
    ...Typography.labelMd,
    color: colors.textDim,
  },
  themeButton: {
    padding: 4,
  },
  glassPanel: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    width: '100%',
    maxWidth: 448, 
    alignSelf: 'center',
    zIndex: 10,
    marginTop: 0,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.primary, 
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    ...Typography.displayMd,
    color: colors.text, 
  },
  subtitle: {
    ...Typography.bodyMd,
    color: colors.textDim, 
    marginTop: 8,
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    ...Typography.labelMd,
    color: colors.textDim,
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputIconLeft: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  inputIconRight: {
    position: 'absolute',
    right: 12,
    zIndex: 1,
    padding: 4,
  },
  input: {
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 10,
    paddingLeft: 40,
    paddingRight: 40,
    color: colors.text, 
    ...Typography.bodyMd,
  },
  pickerInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 12,
    paddingRight: 8,
  },
  loginButton: {
    backgroundColor: colors.primary, 
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  loginButtonText: {
    ...Typography.titleLg,
    color: '#fff',
  },
  footer: {
    flexDirection: 'row',
    marginTop: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    ...Typography.bodyMd,
    color: colors.iconDefault, 
  },
  footerLink: {
    ...Typography.bodyMd,
    color: colors.primary, 
    fontWeight: '600',
  },
  successBox: {
    backgroundColor: '#34d399',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12
  },
  successText: {
    ...Typography.bodyMd,
    color: '#000',
    fontWeight: 'bold',
    textAlign: 'center'
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    ...Typography.labelMd,
    marginBottom: 8
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surfaceContainer,
    width: width * 0.88,
    maxHeight: height * 0.6,
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  modalTitle: {
    ...Typography.titleLg,
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  modalItem: {
    paddingVertical: 14,
    paddingLeft: 4,
    paddingRight: 16,
    borderRadius: 12,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalItemSelected: {
    backgroundColor: 'rgba(74, 225, 118, 0.1)', 
  },
  modalItemText: {
    ...Typography.bodyMd,
    color: colors.textDim,
    textAlign: 'left',
  },
  modalItemTextSelected: {
    color: colors.text,
    fontWeight: 'bold',
  },
  modalCloseBtn: {
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: 8
  },
  modalCloseText: {
    ...Typography.bodyLg,
    color: colors.text,
    textAlign: 'center'
  }
});
