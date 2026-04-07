import { createContext, useContext, useMemo, useState } from 'react'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => localStorage.getItem('language') || 'zh')

  const setAndPersistLanguage = (lang) => {
    setLanguage(lang)
    localStorage.setItem('language', lang)
  }

  const toggleLanguage = () => {
    setAndPersistLanguage(language === 'zh' ? 'en' : 'zh')
  }

  const value = useMemo(() => ({
    language,
    isZh: language === 'zh',
    setLanguage: setAndPersistLanguage,
    toggleLanguage
  }), [language])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
