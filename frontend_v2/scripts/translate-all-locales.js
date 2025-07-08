#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Translation mappings for all languages
const translations = {
  // German translations
  de: {
    // common.json
    "skip": "Überspringen",
    "next": "Weiter",
    "back": "Zurück",
    "continue": "Fortfahren",
    "loading": "Laden...",
    "save": "Speichern",
    "cancel": "Abbrechen",
    "submit": "Einreichen",
    "delete": "Löschen",
    "edit": "Bearbeiten",
    "close": "Schließen",
    "error": "Fehler",
    "success": "Erfolg",
    "warning": "Warnung",
    "info": "Info",
    "backToDashboard": "Zurück zum Dashboard",
    "minutes": "Minuten",
    "hours": "Stunden",
    "days": "Tage",
    "view": "Ansehen",
    "difficulty": {
      "beginner": "Anfänger",
      "intermediate": "Fortgeschritten",
      "advanced": "Experte"
    },
    
    // chat.json
    "aiAdvisor": "KI-Lernberater",
    "newChat": "Neuer Chat",
    "history": "Chat-Verlauf",
    "welcomeTitle": "Hallo! Ich bin Ihr KI-Lernberater",
    "welcomeMessage": "Ich bin hier, um Ihnen bei Ihrer KI-Kompetenzreise zu helfen. Fragen Sie mich nach Lernpfaden, PBL-Szenarien oder KI-Konzepten, die Sie besser verstehen möchten.",
    "inputPlaceholder": "Geben Sie Ihre Nachricht hier ein... (Enter zum Senden)",
    "suggestedTopic1": "Mit welchem PBL-Szenario soll ich beginnen?",
    "suggestedTopic2": "Helfen Sie mir, meine Bewertungsergebnisse zu verstehen",
    "suggestedTopic3": "Was sind meine Schwächen und wie kann ich mich verbessern?",
    "suggestedTopic4": "Erklären Sie KI-Konzepte in einfachen Worten"
  },
  
  // Spanish translations
  es: {
    // common.json
    "skip": "Omitir",
    "next": "Siguiente",
    "back": "Atrás",
    "continue": "Continuar",
    "loading": "Cargando...",
    "save": "Guardar",
    "cancel": "Cancelar",
    "submit": "Enviar",
    "delete": "Eliminar",
    "edit": "Editar",
    "close": "Cerrar",
    "error": "Error",
    "success": "Éxito",
    "warning": "Advertencia",
    "info": "Información",
    "backToDashboard": "Volver al Panel",
    "minutes": "minutos",
    "hours": "horas",
    "days": "días",
    "view": "Ver",
    "difficulty": {
      "beginner": "Principiante",
      "intermediate": "Intermedio",
      "advanced": "Avanzado"
    },
    
    // chat.json
    "aiAdvisor": "Asesor de Aprendizaje IA",
    "newChat": "Nuevo Chat",
    "history": "Historial de Chat",
    "welcomeTitle": "¡Hola! Soy tu Asesor de Aprendizaje IA",
    "welcomeMessage": "Estoy aquí para ayudarte en tu viaje de alfabetización en IA. Pregúntame sobre rutas de aprendizaje, escenarios PBL o cualquier concepto de IA que quieras entender mejor.",
    "inputPlaceholder": "Escribe tu mensaje aquí... (Presiona Enter para enviar)",
    "suggestedTopic1": "¿Con qué escenario PBL debería empezar?",
    "suggestedTopic2": "Ayúdame a entender mis resultados de evaluación",
    "suggestedTopic3": "¿Cuáles son mis áreas débiles y cómo puedo mejorar?",
    "suggestedTopic4": "Explica conceptos de IA en términos simples"
  },
  
  // French translations  
  fr: {
    // common.json
    "skip": "Passer",
    "next": "Suivant",
    "back": "Retour",
    "continue": "Continuer",
    "loading": "Chargement...",
    "save": "Enregistrer",
    "cancel": "Annuler",
    "submit": "Soumettre",
    "delete": "Supprimer",
    "edit": "Modifier",
    "close": "Fermer",
    "error": "Erreur",
    "success": "Succès",
    "warning": "Avertissement",
    "info": "Information",
    "backToDashboard": "Retour au Tableau de Bord",
    "minutes": "minutes",
    "hours": "heures",
    "days": "jours",
    "view": "Voir",
    "difficulty": {
      "beginner": "Débutant",
      "intermediate": "Intermédiaire",
      "advanced": "Avancé"
    },
    
    // chat.json
    "aiAdvisor": "Conseiller d'Apprentissage IA",
    "newChat": "Nouveau Chat",
    "history": "Historique du Chat",
    "welcomeTitle": "Bonjour! Je suis votre Conseiller d'Apprentissage IA",
    "welcomeMessage": "Je suis ici pour vous aider dans votre parcours de littératie IA. Posez-moi des questions sur les parcours d'apprentissage, les scénarios PBL ou tout concept IA que vous souhaitez mieux comprendre.",
    "inputPlaceholder": "Tapez votre message ici... (Appuyez sur Entrée pour envoyer)",
    "suggestedTopic1": "Quel scénario PBL devrais-je commencer?",
    "suggestedTopic2": "Aidez-moi à comprendre mes résultats d'évaluation",
    "suggestedTopic3": "Quels sont mes points faibles et comment puis-je m'améliorer?",
    "suggestedTopic4": "Expliquez les concepts d'IA en termes simples"
  },
  
  // Add more languages as needed...
};

// Function to translate a file
function translateFile(filePath, langCode) {
  try {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const langTranslations = translations[langCode] || {};
    let hasChanges = false;
    
    // Recursive function to translate nested objects
    function translateObject(obj) {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          // Check if it has a placeholder pattern
          if (obj[key].includes(`[${langCode.toUpperCase()}]`) || 
              obj[key].includes('[German]') ||
              obj[key].includes('[Spanish]') ||
              obj[key].includes('[French]') ||
              obj[key].includes('[Italian]') ||
              obj[key].includes('[Japanese]') ||
              obj[key].includes('[Korean]') ||
              obj[key].includes('[Portuguese]') ||
              obj[key].includes('[Russian]') ||
              obj[key].includes('[Thai]') ||
              obj[key].includes('[Arabic]') ||
              obj[key].includes('[Indonesian]') ||
              obj[key].includes('[Chinese')) {
            
            // Check if we have a translation
            if (langTranslations[key]) {
              obj[key] = langTranslations[key];
              hasChanges = true;
            }
          }
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          translateObject(obj[key]);
        }
      }
    }
    
    translateObject(content);
    
    if (hasChanges) {
      fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
      console.log(`✓ Translated: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Main function
function main() {
  const localesDir = path.join(__dirname, '..', 'public', 'locales');
  let totalTranslated = 0;
  
  // Get all language directories
  const langDirs = fs.readdirSync(localesDir)
    .filter(dir => fs.statSync(path.join(localesDir, dir)).isDirectory())
    .filter(dir => dir !== 'en'); // Skip English
  
  console.log('🌐 Starting translation process...\n');
  
  for (const langCode of langDirs) {
    const langDir = path.join(localesDir, langCode);
    const jsonFiles = fs.readdirSync(langDir)
      .filter(file => file.endsWith('.json'));
    
    console.log(`\nProcessing ${langCode}:`);
    
    for (const file of jsonFiles) {
      const filePath = path.join(langDir, file);
      if (translateFile(filePath, langCode)) {
        totalTranslated++;
      }
    }
  }
  
  console.log(`\n✅ Translation complete! Translated ${totalTranslated} files.`);
}

// Run the script
main();