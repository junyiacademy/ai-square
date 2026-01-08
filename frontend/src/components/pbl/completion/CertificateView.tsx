"use client";

import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import Image from "next/image";

interface CertificateViewProps {
  scenarioTitle: string;
  allTasksEvaluated: boolean;
}

export function CertificateView({
  scenarioTitle,
  allTasksEvaluated,
}: CertificateViewProps) {
  const { t, i18n } = useTranslation("pbl");
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [editableName, setEditableName] = useState<string>("");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);
  const certificateRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (!editableName) {
      alert(
        t(
          "complete.certificate.pleaseEnterName",
          "Please enter your name first",
        ),
      );
      return;
    }

    if (!certificateRef.current) {
      alert(
        t(
          "complete.certificate.downloadFailed",
          "Failed to generate PDF. Please try again.",
        ),
      );
      return;
    }

    setIsGeneratingPDF(true);

    try {
      const { generatePDFFromElement } =
        await import("@/lib/client-pdf-generator");
      const fileName = `certificate-${editableName.replace(/\s+/g, "-")}.pdf`;
      await generatePDFFromElement(certificateRef.current, fileName);
    } catch (error) {
      console.error("PDF generation error:", error);
      alert(
        t(
          "complete.certificate.downloadFailed",
          "Failed to generate PDF. Please try again.",
        ),
      );
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (!allTasksEvaluated) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="max-w-5xl mx-auto">
        {/* Display Version - Only visible on screen */}
        <div
          ref={certificateRef}
          className="relative border-4 sm:border-6 lg:border-8 border-double border-purple-600 p-8 sm:p-12 lg:p-16 rounded-lg bg-gradient-to-br from-white via-purple-50 to-white certificate-display flex items-center justify-center min-h-[600px]"
        >
          {/* Decorative corner elements */}
          <div className="absolute top-4 left-4 w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 border-t-2 border-l-2 sm:border-t-3 sm:border-l-3 lg:border-t-4 lg:border-l-4 border-purple-400"></div>
          <div className="absolute top-4 right-4 w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 border-t-2 border-r-2 sm:border-t-3 sm:border-r-3 lg:border-t-4 lg:border-r-4 border-purple-400"></div>
          <div className="absolute bottom-4 left-4 w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 border-b-2 border-l-2 sm:border-b-3 sm:border-l-3 lg:border-b-4 lg:border-l-4 border-purple-400"></div>
          <div className="absolute bottom-4 right-4 w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 border-b-2 border-r-2 sm:border-b-3 sm:border-r-3 lg:border-b-4 lg:border-r-4 border-purple-400"></div>

          {/* Certificate content - centered wrapper */}
          <div className="w-full">
            {/* Title */}
            <div className="text-center mb-6 sm:mb-8 lg:mb-12">
              <h2 className="text-4xl sm:text-4xl lg:text-5xl font-serif font-bold text-purple-700 mb-3 sm:mb-3 lg:mb-4">
                {t("complete.certificate.title")}
              </h2>
              <div className="w-24 sm:w-24 lg:w-32 h-0.5 sm:h-0.5 lg:h-1 bg-purple-600 mx-auto"></div>
            </div>

            {/* Certificate of Completion text */}
            <div className="text-center mb-6 sm:mb-8">
              <p className="text-base sm:text-lg text-gray-700">
                {t("complete.certificate.certifies")}
              </p>
            </div>

            {/* Student name - red border box with edit capability */}
            <div className="text-center mb-6 sm:mb-8">
              <div
                onClick={() => !isEditingName && setIsEditingName(true)}
                className={`inline-block border-2 px-6 py-3 w-[90%] max-w-sm sm:px-10 sm:py-4 sm:w-auto sm:min-w-80 lg:px-12 lg:min-w-96 relative group bg-white cursor-pointer transition-all hover:shadow-md ${
                  editableName ? "border-purple-400" : "border-red-500"
                }`}
              >
                {isEditingName ? (
                  <input
                    type="text"
                    value={editableName}
                    onChange={(e) => setEditableName(e.target.value)}
                    onBlur={() => setIsEditingName(false)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setIsEditingName(false);
                      }
                    }}
                    autoFocus
                    placeholder={t(
                      "complete.certificate.enterYourName",
                      "Enter your name",
                    )}
                    className="text-2xl sm:text-2xl lg:text-4xl font-serif font-bold text-gray-900 bg-transparent border-none outline-none text-center w-full placeholder:text-gray-300"
                  />
                ) : (
                  <>
                    {editableName ? (
                      <p className="text-2xl sm:text-2xl lg:text-4xl font-serif font-bold text-gray-900">
                        {editableName}
                      </p>
                    ) : (
                      <p className="text-2xl sm:text-2xl lg:text-4xl font-serif text-gray-300 italic">
                        {t(
                          "complete.certificate.clickToEnterName",
                          "Click to enter your name",
                        )}
                      </p>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditingName(true);
                      }}
                      className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                      title={t("complete.certificate.editName", "Edit name")}
                    >
                      <svg
                        className="w-5 h-5 text-gray-400 hover:text-purple-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Completion statement */}
            <div className="text-center mb-6 sm:mb-6">
              <p className="text-base sm:text-lg text-gray-700">
                {t("complete.certificate.hasCompleted")}
              </p>
            </div>

            {/* Scenario title - elegant box */}
            <div className="text-center mb-6 sm:mb-8 px-4 sm:px-0">
              <div className="inline-block bg-purple-50 border-2 border-purple-300 px-6 py-3 sm:px-6 sm:py-3 lg:px-8 lg:py-4 rounded w-[90%] max-w-sm sm:w-auto sm:min-w-72 lg:min-w-96">
                <p className="text-lg sm:text-xl lg:text-2xl font-semibold text-purple-900 break-words">
                  {scenarioTitle}
                </p>
              </div>
            </div>

            {/* Course description */}
            <div className="text-center mb-6 sm:mb-8 lg:mb-12">
              <p className="text-sm sm:text-base text-gray-600">
                {t("complete.certificate.courseType")}
              </p>
            </div>

            {/* Date section */}
            <div className="text-center mb-8 sm:mb-10 lg:mb-12">
              <p className="text-sm sm:text-sm text-gray-600 mb-2 sm:mb-2">
                {t("complete.certificate.completionDate")}
              </p>
              <p className="text-xl sm:text-xl lg:text-2xl font-semibold text-gray-900">
                {new Date().toLocaleDateString(
                  i18n.language === "zhTW" ? "zh-TW" : "en-US",
                  {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  },
                )}
              </p>
            </div>

            {/* Footer with logos and signatures */}
            <div className="grid grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mt-8 sm:mt-12 lg:mt-16 pt-6 sm:pt-6 lg:pt-8 border-t border-gray-300">
              {/* code.org - 國際指導單位 */}
              <div className="text-center">
                <div className="border-t-2 border-gray-400 pt-3 sm:pt-3 lg:pt-4 mb-2 sm:mb-2 lg:mb-3">
                  <div className="flex flex-col items-center justify-center gap-2 mb-2 sm:mb-1 lg:mb-2">
                    <div className="h-6 sm:h-7 lg:h-8 flex items-center">
                      <Image
                        src="/images/HourAI_Logo_Stacked_Black.png"
                        alt="code.org Logo"
                        width={80}
                        height={60}
                        className="object-contain h-full w-auto"
                      />
                    </div>
                    <p className="text-xs sm:text-sm lg:text-base font-semibold text-gray-700">
                      code.org
                    </p>
                  </div>
                </div>
                <p className="text-xs sm:text-xs text-gray-500">
                  {t(
                    "complete.certificate.internationalAdvisor",
                    "國際指導單位",
                  )}
                </p>
              </div>
              {/* Junyi Academy */}
              <div className="text-center">
                <div className="border-t-2 border-gray-400 pt-3 sm:pt-3 lg:pt-4 mb-2 sm:mb-2 lg:mb-3">
                  <div className="flex flex-col items-center justify-center gap-2 mb-2 sm:mb-1 lg:mb-2">
                    <div className="h-6 sm:h-7 lg:h-8 flex items-center">
                      <Image
                        src="/images/junyi_logo.jpg"
                        alt="Junyi Academy Logo"
                        width={80}
                        height={40}
                        className="object-contain h-full w-auto"
                      />
                    </div>
                    <p className="text-xs sm:text-sm lg:text-base font-semibold text-gray-700">
                      {t("complete.certificate.junyiAcademy")}
                    </p>
                  </div>
                </div>
                <p className="text-xs sm:text-xs text-gray-500">
                  {t("complete.certificate.provider")}
                </p>
              </div>
              {/* AI Square */}
              <div className="text-center">
                <div className="border-t-2 border-gray-400 pt-3 sm:pt-3 lg:pt-4 mb-2 sm:mb-2 lg:mb-3">
                  <div className="flex flex-col items-center justify-center gap-2 mb-2 sm:mb-1 lg:mb-2">
                    <div className="h-6 sm:h-7 lg:h-8 flex items-center">
                      <Image
                        src="/images/logo.png"
                        alt="AI Square Logo"
                        width={80}
                        height={40}
                        className="object-contain h-full w-auto"
                      />
                    </div>
                    <p className="text-xs sm:text-sm lg:text-base font-semibold text-gray-700">
                      {t("complete.certificate.aiSquare")}
                    </p>
                  </div>
                </div>
                <p className="text-xs sm:text-xs text-gray-500">
                  {t("complete.certificate.platform")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4 print:hidden">
          {/* Download PDF button */}
          <div className="relative inline-block group">
            <button
              onClick={handleDownloadPDF}
              disabled={!editableName || isGeneratingPDF}
              className={`px-8 py-3 rounded-lg font-medium transition-colors shadow-lg flex items-center gap-2 ${
                editableName && !isGeneratingPDF
                  ? "bg-purple-600 text-white hover:bg-purple-700 cursor-pointer"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              {isGeneratingPDF ? (
                <>
                  <svg
                    className="w-5 h-5 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>
                    {t("complete.certificate.generating", "Generating...")}
                  </span>
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  {t("complete.certificate.downloadPDF", "Download PDF")}
                </>
              )}
            </button>
            {!editableName && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                {t(
                  "complete.certificate.pleaseEnterName",
                  "Please enter your name first",
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
