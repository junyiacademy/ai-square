/**
 * Certificate HTML Template Generator
 * Generates HTML for PDF certificate generation
 */

interface CertificateData {
  studentName: string;
  scenarioTitle: string;
  completionDate: string;
  language: 'en' | 'zhTW';
  junyiLogoBase64?: string;
  aiSquareLogoBase64?: string;
}

interface Translations {
  title: string;
  certifies: string;
  hasCompleted: string;
  courseType: string;
  completionDate: string;
  junyiAcademy: string;
  aiSquare: string;
  provider: string;
  platform: string;
}

const translations: Record<'en' | 'zhTW', Translations> = {
  en: {
    title: 'Certificate of Completion',
    certifies: 'This is to certify that',
    hasCompleted: 'has successfully completed',
    courseType: 'AI Literacy Project-Based Learning Course',
    completionDate: 'Date of Completion',
    junyiAcademy: 'Junyi Academy',
    aiSquare: 'AI Square',
    provider: 'Course Provider',
    platform: 'Learning Platform',
  },
  zhTW: {
    title: '完課證書',
    certifies: '茲證明',
    hasCompleted: '已成功完成',
    courseType: 'AI 素養專案式學習課程',
    completionDate: '完成日期',
    junyiAcademy: '均一教育平台',
    aiSquare: 'AI Square',
    provider: '課程提供單位',
    platform: '學習平台',
  },
};

/**
 * Generate certificate HTML for PDF generation
 */
export function generateCertificateHTML(data: CertificateData): string {
  const t = translations[data.language];

  return `
<!DOCTYPE html>
<html lang="${data.language === 'zhTW' ? 'zh-TW' : 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    @page {
      size: A4 portrait;
      margin: 0;
    }

    body {
      margin: 0;
      padding: 0;
      width: 210mm;
      height: 297mm;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
        'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      background: white;
    }

    .certificate-container {
      width: 210mm;
      height: 297mm;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 0;
      margin: 0;
      background: white;
    }

    .certificate-content {
      width: 210mm;
      height: 297mm;
      padding: 12mm 20mm;
      border: 4px double rgb(147, 51, 234);
      background: linear-gradient(to bottom right, white, rgb(243, 232, 255), white);
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
    }

    /* Decorative corners */
    .corner {
      position: absolute;
      width: 30px;
      height: 30px;
      border: 2px solid rgb(167, 139, 250);
    }

    .corner-tl {
      top: 10px;
      left: 10px;
      border-right: none;
      border-bottom: none;
    }

    .corner-tr {
      top: 10px;
      right: 10px;
      border-left: none;
      border-bottom: none;
    }

    .corner-bl {
      bottom: 10px;
      left: 10px;
      border-right: none;
      border-top: none;
    }

    .corner-br {
      bottom: 10px;
      right: 10px;
      border-left: none;
      border-top: none;
    }

    .title {
      font-size: 32px;
      font-weight: bold;
      color: rgb(147, 51, 234);
      margin-bottom: 8px;
      font-family: serif;
    }

    .title-divider {
      width: 80px;
      height: 2px;
      background: rgb(147, 51, 234);
      margin: 0 auto 12px;
    }

    .certifies-text {
      font-size: 14px;
      color: rgb(55, 65, 81);
      margin-bottom: 10px;
    }

    .student-name {
      display: inline-block;
      border: 2px solid rgb(167, 139, 250);
      padding: 6px 28px;
      background: white;
      margin-bottom: 10px;
    }

    .student-name-text {
      font-size: 22px;
      font-weight: bold;
      color: rgb(17, 24, 39);
      font-family: serif;
    }

    .has-completed-text {
      font-size: 14px;
      color: rgb(55, 65, 81);
      margin-bottom: 10px;
    }

    .scenario-title {
      display: inline-block;
      background: rgb(243, 232, 255);
      border: 2px solid rgb(216, 180, 254);
      padding: 10px 20px;
      border-radius: 4px;
      margin-bottom: 12px;
    }

    .scenario-title-text {
      font-size: 18px;
      font-weight: 600;
      color: rgb(88, 28, 135);
    }

    .course-type {
      font-size: 13px;
      color: rgb(75, 85, 99);
      margin-bottom: 12px;
    }

    .completion-date-label {
      font-size: 13px;
      color: rgb(75, 85, 99);
      margin-bottom: 6px;
    }

    .completion-date-value {
      font-size: 16px;
      font-weight: 600;
      color: rgb(17, 24, 39);
      margin-bottom: 18px;
    }

    .footer {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      padding-top: 12px;
      border-top: 1px solid rgb(209, 213, 219);
      margin-top: 12px;
      width: 100%;
    }

    .footer-section {
      text-align: center;
    }

    .footer-signature {
      border-top: 2px solid rgb(156, 163, 175);
      padding-top: 8px;
      margin-bottom: 4px;
    }

    .footer-org {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 4px;
    }

    .footer-logo {
      width: 48px;
      height: 24px;
      object-fit: contain;
    }

    .footer-org-name {
      font-size: 12px;
      font-weight: 600;
      color: rgb(55, 65, 81);
    }

    .footer-role {
      font-size: 10px;
      color: rgb(107, 114, 128);
    }
  </style>
</head>
<body>
  <div class="certificate-container">
    <div class="certificate-content">
      <!-- Decorative corners -->
      <div class="corner corner-tl"></div>
      <div class="corner corner-tr"></div>
      <div class="corner corner-bl"></div>
      <div class="corner corner-br"></div>

      <!-- Certificate content -->
      <div class="title">${t.title}</div>
      <div class="title-divider"></div>

      <div class="certifies-text">${t.certifies}</div>

      <div class="student-name">
        <div class="student-name-text">${data.studentName}</div>
      </div>

      <div class="has-completed-text">${t.hasCompleted}</div>

      <div class="scenario-title">
        <div class="scenario-title-text">${data.scenarioTitle}</div>
      </div>

      <div class="course-type">${t.courseType}</div>

      <div class="completion-date-label">${t.completionDate}</div>
      <div class="completion-date-value">${data.completionDate}</div>

      <!-- Footer with logos -->
      <div class="footer">
        <div class="footer-section">
          <div class="footer-signature">
            <div class="footer-org">
              <img src="${data.junyiLogoBase64 || ''}" alt="Junyi Academy Logo" class="footer-logo" />
              <div class="footer-org-name">${t.junyiAcademy}</div>
            </div>
          </div>
          <div class="footer-role">${t.provider}</div>
        </div>
        <div class="footer-section">
          <div class="footer-signature">
            <div class="footer-org">
              <img src="${data.aiSquareLogoBase64 || ''}" alt="AI Square Logo" class="footer-logo" />
              <div class="footer-org-name">${t.aiSquare}</div>
            </div>
          </div>
          <div class="footer-role">${t.platform}</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}
