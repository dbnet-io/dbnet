

var all_text : { [key: string]: { [key: string]: string; } } = {
  'Dashboard': {
    fr: 'Dashboard',
  },
  'Executions': {
    fr: 'Exécutions',
  },
  'Connections': {
    fr: 'Connexions',
  },
  'Connection Form': {
    fr: 'Formulaire de connexion',
  },
  'Refresh': {
    fr: 'Rafraîchir',
  },
  'New': {
    fr: 'Nouvelle',
  },
  'Search': {
    fr: 'Chercher',
  },
  'Test': {
    fr: 'Tester',
  },
  'Save': {
    fr: 'Sauvegarder',
  },
  'Cancel': {
    fr: 'Annuler',
  },
  'Connectivity': {
    fr: 'Connectivité',
  },
  'Edit Connection': {
    fr: 'Modifier la connexion',
  },
  'Test Connection': {
    fr: 'Tester la connexion',
  },
  'Delete Connection': {
    fr: 'Supprimer la connexion',
  },
  'Type': {
    fr: 'Type',
    es: 'Tipo',
  },
}


export const t = function(text: string, lang='eng') : string {
  if(text in all_text) {
    let translations = all_text[text]
    if(lang in translations) return translations[lang]
    return text
  }
  return text
}