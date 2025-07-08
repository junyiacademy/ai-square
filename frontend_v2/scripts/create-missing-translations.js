const fs = require('fs');
const path = require('path');

// List of all supported languages
const languages = ['zhTW', 'zhCN', 'pt', 'ar', 'id', 'th', 'es', 'ja', 'ko', 'fr', 'de', 'ru', 'it'];

// Default content for missing files
const defaultAssessment = {
  title: "AI Literacy Assessment",
  subtitle: "Test your AI knowledge and skills",
  description: "Evaluate your understanding of AI concepts through our comprehensive assessment",
  startAssessment: "Start Assessment",
  continueAssessment: "Continue Assessment",
  retakeAssessment: "Retake Assessment",
  viewResults: "View Results",
  practiceMode: "Practice Mode",
  testMode: "Test Mode",
  question: "Question",
  questions: "Questions",
  timeLimit: "Time Limit",
  minutes: "minutes",
  score: "Score",
  yourScore: "Your Score",
  passingScore: "Passing Score",
  totalQuestions: "Total Questions",
  correctAnswers: "Correct Answers",
  incorrectAnswers: "Incorrect Answers",
  timeSpent: "Time Spent",
  submit: "Submit",
  next: "Next",
  previous: "Previous",
  finish: "Finish",
  results: "Results",
  passed: "Passed",
  failed: "Failed",
  certificate: "Certificate",
  downloadCertificate: "Download Certificate",
  shareCertificate: "Share Certificate",
  tryAgain: "Try Again",
  backToAssessments: "Back to Assessments",
  assessmentComplete: "Assessment Complete",
  congratulations: "Congratulations!",
  betterLuckNextTime: "Better luck next time!",
  reviewAnswers: "Review Answers",
  correct: "Correct",
  incorrect: "Incorrect",
  skipped: "Skipped",
  explanation: "Explanation",
  yourAnswer: "Your Answer",
  correctAnswer: "Correct Answer",
  domains: {
    engaging: "Engaging with AI",
    creating: "Creating with AI",
    managing: "Managing with AI",
    designing: "Designing with AI"
  },
  levels: {
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",
    expert: "Expert"
  },
  instructions: {
    title: "Assessment Instructions",
    readCarefully: "Please read the instructions carefully before starting",
    selectBestAnswer: "Select the best answer for each question",
    reviewBeforeSubmit: "Review your answers before submitting",
    cannotChangeAfterSubmit: "You cannot change answers after submission"
  },
  feedback: {
    excellent: "Excellent work!",
    good: "Good job!",
    needsImprovement: "Needs improvement",
    keepPracticing: "Keep practicing!"
  }
};

const defaultPbl = {
  title: "Problem-Based Learning",
  subtitle: "Learn through real-world scenarios",
  description: "Apply your knowledge to solve practical problems",
  scenarios: "Scenarios",
  startScenario: "Start Scenario",
  continueScenario: "Continue Scenario",
  scenarioProgress: "Scenario Progress",
  tasks: "Tasks",
  completed: "Completed",
  inProgress: "In Progress",
  notStarted: "Not Started"
};

const defaultDiscovery = {
  title: "Career Discovery",
  subtitle: "Explore AI career paths",
  description: "Discover opportunities in the AI field",
  careers: "Careers",
  exploreCareer: "Explore Career",
  careerPath: "Career Path",
  requiredSkills: "Required Skills",
  averageSalary: "Average Salary",
  jobOutlook: "Job Outlook",
  dayInLife: "A Day in the Life",
  getStarted: "Get Started"
};

// V2 specific translations
const defaultV2 = {
  scenario: {
    title: "Learning Scenarios",
    subtitle: "Choose your learning path",
    types: {
      pbl: "Problem-Based Learning",
      discovery: "Career Discovery", 
      assessment: "Assessment"
    },
    status: {
      created: "Created",
      active: "Active",
      paused: "Paused",
      completed: "Completed",
      abandoned: "Abandoned"
    },
    continue: "Continue",
    start: "Start",
    resume: "Resume",
    abandon: "Abandon",
    pblSubtitle: "Multi-stage learning scenario",
    discoverySubtitle: "Dynamic career exploration",
    assessmentSubtitle: "Multi-attempt assessment scenario"
  },
  program: {
    title: "Programs",
    subtitle: "Learning stages",
    stage: "Stage",
    attempt: "Attempt",
    practice: "Practice",
    formal: "Formal",
    completed: "Completed",
    active: "Active", 
    pending: "Pending",
    skipped: "Skipped"
  },
  task: {
    title: "Tasks",
    subtitle: "Learning activities",
    types: {
      chat: "Discussion",
      code: "Coding",
      quiz: "Quiz",
      submission: "Submission",
      discussion: "Group Discussion"
    },
    submit: "Submit",
    skip: "Skip",
    retry: "Retry",
    next: "Next Task",
    previous: "Previous Task"
  },
  evaluation: {
    title: "Evaluation",
    score: "Score",
    feedback: "Feedback",
    strengths: "Strengths",
    improvements: "Areas for Improvement",
    ksaAchievement: "Skills Achievement"
  },
  dashboard: {
    title: "Learning Dashboard",
    continueLearning: "Continue Learning",
    startNew: "Start Something New",
    recentActivity: "Recent Activity",
    achievements: "Achievements",
    progress: "Progress"
  }
};

// Create missing files for each language
languages.forEach(lang => {
  const localeDir = path.join(__dirname, '..', 'public', 'locales', lang);
  
  // Create assessment.json if missing
  const assessmentPath = path.join(localeDir, 'assessment.json');
  if (!fs.existsSync(assessmentPath)) {
    fs.writeFileSync(assessmentPath, JSON.stringify(defaultAssessment, null, 2));
    console.log(`Created ${lang}/assessment.json`);
  }

  // Create pbl.json if missing
  const pblPath = path.join(localeDir, 'pbl.json');
  if (!fs.existsSync(pblPath)) {
    fs.writeFileSync(pblPath, JSON.stringify(defaultPbl, null, 2));
    console.log(`Created ${lang}/pbl.json`);
  }

  // Create discovery.json if missing  
  const discoveryPath = path.join(localeDir, 'discovery.json');
  if (!fs.existsSync(discoveryPath)) {
    fs.writeFileSync(discoveryPath, JSON.stringify(defaultDiscovery, null, 2));
    console.log(`Created ${lang}/discovery.json`);
  }

  // Create v2.json for V2 specific translations
  const v2Path = path.join(localeDir, 'v2.json');
  if (!fs.existsSync(v2Path)) {
    fs.writeFileSync(v2Path, JSON.stringify(defaultV2, null, 2));
    console.log(`Created ${lang}/v2.json`);
  }
});

// Also create for en if missing
const enDir = path.join(__dirname, '..', 'public', 'locales', 'en');
const enPblPath = path.join(enDir, 'pbl.json');
if (!fs.existsSync(enPblPath)) {
  fs.writeFileSync(enPblPath, JSON.stringify(defaultPbl, null, 2));
  console.log(`Created en/pbl.json`);
}

const enV2Path = path.join(enDir, 'v2.json');
if (!fs.existsSync(enV2Path)) {
  fs.writeFileSync(enV2Path, JSON.stringify(defaultV2, null, 2));
  console.log(`Created en/v2.json`);
}

console.log('All missing translation files created successfully!');