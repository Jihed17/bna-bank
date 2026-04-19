import React, { createContext, useContext, useState, useEffect } from 'react';

// Language context
const LanguageContext = createContext();

// Translations
const translations = {
  fr: {
    // Navigation
    nav: {
      home: 'Accueil',
      services: 'Services',
      agencies: 'Agences',
      appointments: 'Rendez-vous',
      assistant: 'Assistant',
      profile: 'Profil',
      login: 'Connexion',
      register: 'S\'inscrire',
      logout: 'Déconnexion',
      dashboard: 'Tableau de bord'
    },
    // Common
    common: {
      loading: 'Chargement...',
      error: 'Erreur',
      success: 'Succès',
      cancel: 'Annuler',
      save: 'Enregistrer',
      edit: 'Modifier',
      delete: 'Supprimer',
      search: 'Rechercher',
      filter: 'Filtrer',
      close: 'Fermer',
      confirm: 'Confirmer',
      back: 'Retour',
      next: 'Suivant',
      previous: 'Précédent',
      send: 'Envoyer',
      yes: 'Oui',
      no: 'Non',
      required: 'Obligatoire',
      optional: 'Optionnel'
    },
    // Auth
    auth: {
      login: 'Connexion',
      register: 'Inscription',
      email: 'Email',
      password: 'Mot de passe',
      confirmPassword: 'Confirmer le mot de passe',
      firstName: 'Prénom',
      lastName: 'Nom',
      phone: 'Téléphone',
      cin: 'CIN',
      dateOfBirth: 'Date de naissance',
      address: 'Adresse',
      forgotPassword: 'Mot de passe oublié?',
      resetPassword: 'Réinitialiser le mot de passe',
      alreadyHaveAccount: 'Vous avez déjà un compte?',
      dontHaveAccount: 'Vous n\'avez pas de compte?',
      loginSuccess: 'Connexion réussie!',
      registerSuccess: 'Inscription réussie!',
      logoutSuccess: 'Déconnexion réussie'
    },
    // Services
    services: {
      title: 'Nos Services',
      description: 'Découvrez tous nos services bancaires',
      categories: {
        comptes_bancaires: 'Comptes Bancaires',
        credits_et_financement: 'Crédits et Financement',
        cartes_bancaires: 'Cartes Bancaires',
        services_electroniques: 'Services Électroniques',
        change_et_devises: 'Change et Devises',
        assurances: 'Assurances',
        investissement: 'Investissement',
        services_aux_entreprises: 'Services aux Entreprises',
        autres: 'Autres'
      },
      duration: 'Durée',
      requirements: 'Prérequis',
      documents: 'Documents requis',
      fees: 'Frais',
      bookAppointment: 'Prendre rendez-vous'
    },
    // Agencies
    agencies: {
      title: 'Nos Agences',
      description: 'Trouvez l\'agence la plus proche de vous',
      searchPlaceholder: 'Rechercher une agence...',
      filterByGovernorate: 'Filtrer par gouvernorat',
      showOnMap: 'Voir sur la carte',
      openingHours: 'Heures d\'ouverture',
      contact: 'Contact',
      facilities: 'Équipements',
      distance: 'Distance',
      getDirections: 'Obtenir l\'itinéraire'
    },
    // Appointments
    appointments: {
      title: 'Mes Rendez-vous',
      bookNew: 'Prendre un rendez-vous',
      upcoming: 'À venir',
      past: 'Passés',
      cancelled: 'Annulés',
      status: {
        en_attente: 'En attente',
        confirmé: 'Confirmé',
        en_cours: 'En cours',
        terminé: 'Terminé',
        annulé: 'Annulé',
        reporté: 'Reporté'
      },
      dateTime: 'Date et heure',
      agency: 'Agence',
      service: 'Service',
      agent: 'Agent',
      notes: 'Notes',
      cancel: 'Annuler le rendez-vous',
      reschedule: 'Reporter le rendez-vous',
      checkIn: 'Check-in',
      checkOut: 'Check-out',
      feedback: 'Donner votre avis'
    },
    // Assistant
    assistant: {
      title: 'Assistant Intelligent',
      welcome: 'Bonjour! Je suis votre assistant BNA. Comment puis-je vous aider?',
      placeholder: 'Tapez votre message...',
      suggestions: {
        appointment: 'Prendre un rendez-vous',
        services: 'Découvrir les services',
        agencies: 'Trouver une agence',
        support: 'Contacter le support'
      },
      typing: 'L\'assistant tape...'
    },
    // Errors
    errors: {
      network: 'Erreur de connexion',
      server: 'Erreur serveur',
      notFound: 'Page non trouvée',
      unauthorized: 'Accès non autorisé',
      validation: 'Erreur de validation',
      generic: 'Une erreur est survenue'
    }
  },
  ar: {
    // Navigation
    nav: {
      home: 'الرئيسية',
      services: 'الخدمات',
      agencies: 'الفروع',
      appointments: 'المواعيد',
      assistant: 'المساعد',
      profile: 'الملف الشخصي',
      login: 'تسجيل الدخول',
      register: 'إنشاء حساب',
      logout: 'تسجيل الخروج',
      dashboard: 'لوحة التحكم'
    },
    // Common
    common: {
      loading: 'جاري التحميل...',
      error: 'خطأ',
      success: 'نجح',
      cancel: 'إلغاء',
      save: 'حفظ',
      edit: 'تعديل',
      delete: 'حذف',
      search: 'بحث',
      filter: 'تصفية',
      close: 'إغلاق',
      confirm: 'تأكيد',
      back: 'رجوع',
      next: 'التالي',
      previous: 'السابق',
      send: 'إرسال',
      yes: 'نعم',
      no: 'لا',
      required: 'إلزامي',
      optional: 'اختياري'
    },
    // Auth
    auth: {
      login: 'تسجيل الدخول',
      register: 'إنشاء حساب',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      confirmPassword: 'تأكيد كلمة المرور',
      firstName: 'الاسم الأول',
      lastName: 'الاسم العائلي',
      phone: 'الهاتف',
      cin: 'رقم بطاقة التعريف',
      dateOfBirth: 'تاريخ الميلاد',
      address: 'العنوان',
      forgotPassword: 'نسيت كلمة المرور؟',
      resetPassword: 'إعادة تعيين كلمة المرور',
      alreadyHaveAccount: 'لديك حساب بالفعل؟',
      dontHaveAccount: 'ليس لديك حساب؟',
      loginSuccess: 'تم تسجيل الدخول بنجاح!',
      registerSuccess: 'تم إنشاء الحساب بنجاح!',
      logoutSuccess: 'تم تسجيل الخروج بنجاح'
    },
    // Services
    services: {
      title: 'خدماتنا',
      description: 'اكتشف جميع خدماتنا المصرفية',
      categories: {
        comptes_bancaires: 'الحسابات المصرفية',
        credits_et_financement: 'القروض والتمويل',
        cartes_bancaires: 'البطاقات المصرفية',
        services_electroniques: 'الخدمات الإلكترونية',
        change_et_devises: 'الصرف والعملات',
        assurances: 'التأمين',
        investissement: 'الاستثمار',
        services_aux_entreprises: 'خدمات الشركات',
        autres: 'أخرى'
      },
      duration: 'المدة',
      requirements: 'المتطلبات',
      documents: 'المستندات المطلوبة',
      fees: 'الرسوم',
      bookAppointment: 'حجز موعد'
    },
    // Agencies
    agencies: {
      title: 'فروعنا',
      description: 'ابحث عن أقرب فرع لك',
      searchPlaceholder: 'البحث عن فرع...',
      filterByGovernorate: 'تصفية حسب الولاية',
      showOnMap: 'عرض على الخريطة',
      openingHours: 'ساعات العمل',
      contact: 'التواصل',
      facilities: 'المرافق',
      distance: 'المسافة',
      getDirections: 'الحصول على الاتجاهات'
    },
    // Appointments
    appointments: {
      title: 'مواعيدي',
      bookNew: 'حجز موعد جديد',
      upcoming: 'القادمة',
      past: 'السابقة',
      cancelled: 'ملغاة',
      status: {
        en_attente: 'في الانتظار',
        confirmé: 'مؤكد',
        en_cours: 'قيد التنفيذ',
        terminé: 'منتهي',
        annulé: 'ملغي',
        reporté: 'مؤجل'
      },
      dateTime: 'التاريخ والوقت',
      agency: 'الفرع',
      service: 'الخدمة',
      agent: 'الموظف',
      notes: 'ملاحظات',
      cancel: 'إلغاء الموعد',
      reschedule: 'تأجيل الموعد',
      checkIn: 'تسجيل الوصول',
      checkOut: 'تسجيل الخروج',
      feedback: 'إعطاء رأيك'
    },
    // Assistant
    assistant: {
      title: 'المساعد الذكي',
      welcome: 'مرحباً! أنا مساعد BNA الخاص بك. كيف يمكنني مساعدتك؟',
      placeholder: 'اكتب رسالتك...',
      suggestions: {
        appointment: 'حجز موعد',
        services: 'اكتشاف الخدمات',
        agencies: 'البحث عن فرع',
        support: 'التواصل مع الدعم'
      },
      typing: 'المساعد يكتب...'
    },
    // Errors
    errors: {
      network: 'خطأ في الاتصال',
      server: 'خطأ في الخادم',
      notFound: 'الصفحة غير موجودة',
      unauthorized: 'وصول غير مصرح به',
      validation: 'خطأ في التحقق',
      generic: 'حدث خطأ ما'
    }
  }
};

// Language provider
export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const savedLanguage = localStorage.getItem('language');
    return savedLanguage || 'fr';
  });

  const [direction, setDirection] = useState('ltr');

  useEffect(() => {
    localStorage.setItem('language', language);
    const newDirection = language === 'ar' ? 'rtl' : 'ltr';
    setDirection(newDirection);
    document.documentElement.dir = newDirection;
    document.documentElement.lang = language;
  }, [language]);

  const t = (key) => {
    const keys = key.split('.');
    let value = translations[language];
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        value = undefined;
        break;
      }
    }
    
    return value || key;
  };

  const changeLanguage = (newLanguage) => {
    if (translations[newLanguage]) {
      setLanguage(newLanguage);
    }
  };

  const value = {
    language,
    direction,
    t,
    changeLanguage,
    availableLanguages: Object.keys(translations),
    translations: translations[language]
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

// Custom hook
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
