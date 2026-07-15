import React, { createContext, useContext, useState, useEffect } from 'react';

const translations = {
  en: {
    workspaceName: 'EDARA IFM',
    searchPlaceholder: 'Search channels, messages, docs, media...',
    active: 'Active',
    away: 'Away',
    dnd: 'Do Not Disturb',
    ceoTopic: 'Top-down announcements from the CEO office — read-only for members',
    adminPanel: 'Admin Panel',
    saBadge: 'SA',
    langToggle: 'العربية',
    threads: 'Threads',
    saved: 'Saved',
    announcements: 'Announcements',
    channels: 'Channels',
    directMessages: 'Direct Messages',
    addTeammates: 'Add teammates',
    viewProfile: 'View profile',
    preferences: 'Preferences',
    signOut: 'Sign out of ETeams',
    // Channels
    channel_general: 'general',
    channel_procurement: 'procurement',
    channel_warehouse: 'warehouse',
    channel_announcements: 'announcements',
    channel_ceo_announcements: 'ceo-announcements',
    // People
    mohamed_beltagy: 'Mohamed Beltagy',
    karim_sobhy: 'Karim Sobhy',
    // Create Channel Modal
    createChannelTitle: 'Create a channel',
    channelNameLabel: 'Name',
    channelNamePlaceholder: '# e.g. project-updates',
    channelDescLabel: 'Description (optional)',
    channelPrivacy: 'Make private',
    channelPrivacyDesc: 'When a channel is set to private, it can only be viewed or joined by invitation.',
    cancel: 'Cancel',
    create: 'Create',
    channelDescription: "You'll be able to assign a Channel Manager and invite members after creation.",
    descriptionLabel: 'Description / topic',
    descriptionPlaceholder: 'What is this channel about?',
    typeLabel: 'Type',
    publicChannel: '🌐 Public (all staff can join)',
    privateChannel: '🔒 Private (invite only)',
    announcementChannel: '📢 Announcement (read-only for members)',
    retentionLabel: 'Retention policy',
    forever: 'Forever (CEO/HR level)',
    '7years': '7 years (compliance default)',
    '3years': '3 years (general)',
    '1year': '1 year (temporary)',
    createChannelButton: 'Create Channel',
    newMessageTip: 'New message',
    // Profile Settings
    profileSettingsTitle: 'Profile Settings',
    profileSub: 'Update your personal information and preferences.',
    fullName: 'Full Name',
    firstName: 'First name',
    lastName: 'Last name',
    jobTitle: 'Job title',
    username: 'Username',
    phone: 'Phone number',
    saveChanges: 'Save Changes',
    // Login
    signInTitle: 'Sign in to your workspace',
    signInSub: 'Stay connected. Work together. Get things done.',
    username: 'Username',
    password: 'Password',
    signInBtn: 'Sign In',
    signingIn: 'Signing in…',
    // Chat Area & Threads
    tabMessages: 'Messages',
    tabFiles: 'Files',
    tabPinned: 'Pinned',
    tabPeople: 'People',
    today: 'Today',
    threadTitle: 'Thread',
    replies: 'replies',
    replyPlaceholder: 'Reply in thread...',
    messagePlaceholder: 'Message',
    messageHint: 'Enter to send - @ to mention - *bold* - _italic_',
    ceoMessage: "Team, pleased to announce our new internal platform! Let's get to work.",
    monaNader: 'Mona Nader',
    monaMessage: 'Team, pleased to announce the new Q3 vendor contracts are finalized.',
    karimMessage: 'Looks great!',
    tabFilesEmpty: 'Files will appear here.',
    tabPinnedEmpty: 'Pinned messages will appear here.',
    tabPeopleEmpty: 'People list will appear here.',
    // Admin Panel
    adminDashboard: 'Dashboard',
    adminUsers: 'Users',
    adminChannelsPerms: 'Channels & Permissions',
    adminAudit: 'Audit Log',
    adminBroadcast: 'Broadcast',
    adminSecurity: 'Security & Retention',
    adminBackToChat: 'Back to chat',
    adminFullControl: 'Full system control',
    adminOverview: 'Workspace Overview',
    adminTotalUsers: 'Total Users',
    adminActiveChannels: 'Active Channels',
    adminMessagesSent: 'Messages Sent',
    adminUnderDev: 'This module is currently under development.'
  },
  ar: {
    workspaceName: 'إدارة IFM',
    searchPlaceholder: 'البحث في القنوات، الرسائل...',
    active: 'نشط',
    away: 'بالخارج',
    dnd: 'ممنوع الإزعاج',
    ceoTopic: 'إعلانات إدارية من مكتب الرئيس التنفيذي — للقراءة فقط',
    adminPanel: 'لوحة التحكم',
    saBadge: 'أدمن',
    langToggle: 'English',
    threads: 'المحادثات المتسلسلة',
    saved: 'المحفوظات',
    announcements: 'الإعلانات',
    channels: 'القنوات',
    directMessages: 'الرسائل المباشرة',
    addTeammates: 'إضافة زملاء',
    viewProfile: 'عرض الملف الشخصي',
    preferences: 'الإعدادات',
    signOut: 'تسجيل الخروج من ETeams',
    // Channels
    channel_general: 'العام',
    channel_procurement: 'المشتريات',
    channel_warehouse: 'المخازن',
    channel_announcements: 'الإعلانات',
    channel_ceo_announcements: 'إعلانات-الرئيس-التنفيذي',
    // People
    mohamed_beltagy: 'محمد البلتاجي',
    karim_sobhy: 'كريم صبحي',
    // Create Channel Modal
    createChannelTitle: 'إنشاء قناة',
    channelNameLabel: 'الاسم',
    channelNamePlaceholder: '# مثلاً تحديثات-المشروع',
    channelDescLabel: 'الوصف (اختياري)',
    channelPrivacy: 'قناة خاصة',
    channelPrivacyDesc: 'عند تعيين القناة كخاصة، لا يمكن رؤيتها أو الانضمام إليها إلا بدعوة.',
    cancel: 'إلغاء',
    create: 'إنشاء',
    channelDescription: 'ستتمكن من تعيين مدير للقناة ودعوة الأعضاء بعد إنشائها.',
    descriptionLabel: 'الوصف / الموضوع',
    descriptionPlaceholder: 'عن ماذا تتحدث هذه القناة؟',
    typeLabel: 'النوع',
    publicChannel: '🌐 عام (كل الموظفين يمكنهم الانضمام)',
    privateChannel: '🔒 خاص (بالدعوة فقط)',
    announcementChannel: '📢 إعلان (للقراءة فقط)',
    retentionLabel: 'سياسة الاحتفاظ',
    forever: 'للأبد (مستوى CEO/HR)',
    '7years': '7 سنوات (الافتراضي للامتثال)',
    '3years': '3 سنوات (عام)',
    '1year': 'سنة واحدة (مؤقت)',
    createChannelButton: 'إنشاء قناة',
    newMessageTip: 'رسالة جديدة',
    // Profile Settings
    profileSettingsTitle: 'إعدادات الحساب',
    profileSub: 'تحديث معلوماتك الشخصية والإعدادات.',
    fullName: 'الاسم الكامل',
    firstName: 'الاسم الأول',
    lastName: 'اسم العائلة',
    jobTitle: 'المسمى الوظيفي',
    username: 'اسم المستخدم',
    phone: 'رقم الهاتف',
    saveChanges: 'حفظ التغييرات',
    // Login
    signInTitle: 'تسجيل الدخول لمساحة العمل',
    signInSub: 'ابقى على اتصال. اعملوا معاً. أنجزوا المهام.',
    username: 'اسم المستخدم',
    password: 'كلمة المرور',
    signInBtn: 'تسجيل الدخول',
    signingIn: 'جاري تسجيل الدخول…',
    // Chat Area & Threads
    tabMessages: 'الرسائل',
    tabFiles: 'الملفات',
    tabPinned: 'المثبتة',
    tabPeople: 'الأعضاء',
    today: 'اليوم',
    threadTitle: 'المحادثة المتسلسلة',
    replies: 'ردود',
    replyPlaceholder: 'اكتب رداً...',
    messagePlaceholder: 'رسالة',
    messageHint: 'اضغط Enter للإرسال - @ للإشارة - *عريض* - _مائل_',
    ceoMessage: 'فريق العمل، يسعدنا أن نعلن عن منصتنا الداخلية الجديدة! دعونا نبدأ العمل.',
    monaNader: 'منى نادر',
    monaMessage: 'فريق العمل، يسعدنا أن نعلن أن عقود الموردين للربع الثالث قد اكتملت.',
    karimMessage: 'يبدو رائعاً!',
    tabFilesEmpty: 'ستظهر الملفات هنا.',
    tabPinnedEmpty: 'ستظهر الرسائل المثبتة هنا.',
    tabPeopleEmpty: 'ستظهر قائمة الأعضاء هنا.',
    // Admin Panel
    adminDashboard: 'لوحة القيادة',
    adminUsers: 'المستخدمون',
    adminChannelsPerms: 'القنوات والصلاحيات',
    adminAudit: 'سجل التدقيق',
    adminBroadcast: 'البث الإذاعي',
    adminSecurity: 'الأمان والاحتفاظ',
    adminBackToChat: 'العودة للدردشة',
    adminFullControl: 'تحكم كامل بالنظام',
    adminOverview: 'نظرة عامة على مساحة العمل',
    adminTotalUsers: 'إجمالي المستخدمين',
    adminActiveChannels: 'القنوات النشطة',
    adminMessagesSent: 'الرسائل المرسلة',
    adminUnderDev: 'هذه الوحدة قيد التطوير حالياً.'
  }
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('en');

  useEffect(() => {
    if (lang === 'ar') {
      document.documentElement.setAttribute('dir', 'rtl');
    } else {
      document.documentElement.removeAttribute('dir');
    }
  }, [lang]);

  const toggleLang = () => {
    setLang(prev => (prev === 'en' ? 'ar' : 'en'));
  };

  const t = (key) => translations[lang][key] || key;

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
