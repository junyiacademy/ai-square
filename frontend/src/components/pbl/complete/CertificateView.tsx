"use client";

/**
 * Certificate View Component
 *
 * Displays the completion certificate with print and PDF support.
 * Includes editable name field and download functionality.
 */

import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import Image from "next/image";

interface CertificateViewProps {
  scenarioTitle: string;
}

export function CertificateView({ scenarioTitle }: CertificateViewProps) {
  const { t, i18n } = useTranslation(["pbl"]);
  const certificateRef = useRef<HTMLDivElement>(null);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editableName, setEditableName] = useState("");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    if (!editableName) {
      alert(
        t(
          "pbl:complete.certificate.pleaseEnterName",
          "Please enter your name first"
        )
      );
      return;
    }

    if (!certificateRef.current) {
      alert(
        t(
          "pbl:complete.certificate.downloadFailed",
          "Failed to generate PDF. Please try again."
        )
      );
      return;
    }

    setIsGeneratingPDF(true);

    try {
      const { generatePDFFromElement } = await import(
        "@/lib/client-pdf-generator"
      );
      const fileName = `certificate-${editableName.replace(/\s+/g, "-")}.pdf`;
      await generatePDFFromElement(certificateRef.current, fileName);
    } catch (error) {
      console.error("PDF generation error:", error);
      alert(
        t(
          "pbl:complete.certificate.downloadFailed",
          "Failed to generate PDF. Please try again."
        )
      );
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const completionDate = new Date().toLocaleDateString(
    i18n.language === "zhTW" ? "zh-TW" : "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="max-w-5xl mx-auto">
        {/* Display Version */}
        <div
          ref={certificateRef}
          className="relative border-4 sm:border-6 lg:border-8 border-double border-purple-600 p-8 sm:p-12 lg:p-16 rounded-lg bg-gradient-to-br from-white via-purple-50 to-white certificate-display flex items-center justify-center min-h-[600px]"
        >
          {/* Decorative corner elements */}
          <CornerDecorations />

          {/* Certificate content */}
          <div className="w-full">
            {/* Title */}
            <div className="text-center mb-6 sm:mb-8 lg:mb-12">
              <h2 className="text-4xl sm:text-4xl lg:text-5xl font-serif font-bold text-purple-700 mb-3 sm:mb-3 lg:mb-4">
                {t("pbl:complete.certificate.title")}
              </h2>
              <div className="w-24 sm:w-24 lg:w-32 h-0.5 sm:h-0.5 lg:h-1 bg-purple-600 mx-auto"></div>
            </div>

            {/* Certificate of Completion text */}
            <div className="text-center mb-6 sm:mb-8">
              <p className="text-base sm:text-lg text-gray-700">
                {t("pbl:complete.certificate.certifies")}
              </p>
            </div>

            {/* Student name - editable */}
            <NameInputField
              editableName={editableName}
              isEditingName={isEditingName}
              onNameChange={setEditableName}
              onEditingChange={setIsEditingName}
              t={t}
            />

            {/* Completion statement */}
            <div className="text-center mb-6 sm:mb-6">
              <p className="text-base sm:text-lg text-gray-700">
                {t("pbl:complete.certificate.hasCompleted")}
              </p>
            </div>

            {/* Scenario title */}
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
                {t("pbl:complete.certificate.courseType")}
              </p>
            </div>

            {/* Date section */}
            <div className="text-center mb-8 sm:mb-10 lg:mb-12">
              <p className="text-sm sm:text-sm text-gray-600 mb-2 sm:mb-2">
                {t("pbl:complete.certificate.completionDate")}
              </p>
              <p className="text-xl sm:text-xl lg:text-2xl font-semibold text-gray-900">
                {completionDate}
              </p>
            </div>

            {/* Footer with logos */}
            <CertificateFooter t={t} />
          </div>
        </div>

        {/* Print-Only Version */}
        <PrintCertificate
          editableName={editableName}
          scenarioTitle={scenarioTitle}
          completionDate={completionDate}
          t={t}
        />

        {/* Action buttons */}
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4 print:hidden">
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
                    {t("pbl:complete.certificate.generating", "Generating...")}
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
                  {t("pbl:complete.certificate.downloadPDF", "Download PDF")}
                </>
              )}
            </button>
            {!editableName && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                {t(
                  "pbl:complete.certificate.pleaseEnterName",
                  "Please enter your name first"
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CornerDecorations() {
  return (
    <>
      <div className="absolute top-4 left-4 w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 border-t-2 border-l-2 sm:border-t-3 sm:border-l-3 lg:border-t-4 lg:border-l-4 border-purple-400"></div>
      <div className="absolute top-4 right-4 w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 border-t-2 border-r-2 sm:border-t-3 sm:border-r-3 lg:border-t-4 lg:border-r-4 border-purple-400"></div>
      <div className="absolute bottom-4 left-4 w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 border-b-2 border-l-2 sm:border-b-3 sm:border-l-3 lg:border-b-4 lg:border-l-4 border-purple-400"></div>
      <div className="absolute bottom-4 right-4 w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 border-b-2 border-r-2 sm:border-b-3 sm:border-r-3 lg:border-b-4 lg:border-r-4 border-purple-400"></div>
    </>
  );
}

interface NameInputFieldProps {
  editableName: string;
  isEditingName: boolean;
  onNameChange: (name: string) => void;
  onEditingChange: (editing: boolean) => void;
  t: ReturnType<typeof useTranslation>["t"];
}

function NameInputField({
  editableName,
  isEditingName,
  onNameChange,
  onEditingChange,
  t,
}: NameInputFieldProps) {
  return (
    <div className="text-center mb-6 sm:mb-8">
      <div
        onClick={() => !isEditingName && onEditingChange(true)}
        className={`inline-block border-2 px-6 py-3 w-[90%] max-w-sm sm:px-10 sm:py-4 sm:w-auto sm:min-w-80 lg:px-12 lg:min-w-96 relative group bg-white cursor-pointer transition-all hover:shadow-md ${
          editableName ? "border-purple-400" : "border-red-500"
        }`}
      >
        {isEditingName ? (
          <input
            type="text"
            value={editableName}
            onChange={(e) => onNameChange(e.target.value)}
            onBlur={() => onEditingChange(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onEditingChange(false);
              }
            }}
            autoFocus
            placeholder={t(
              "pbl:complete.certificate.enterYourName",
              "Enter your name"
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
                  "pbl:complete.certificate.clickToEnterName",
                  "Click to enter your name"
                )}
              </p>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditingChange(true);
              }}
              className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
              title={t("pbl:complete.certificate.editName", "Edit name")}
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
  );
}

interface CertificateFooterProps {
  t: ReturnType<typeof useTranslation>["t"];
}

function CertificateFooter({ t }: CertificateFooterProps) {
  return (
    <div className="grid grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mt-8 sm:mt-12 lg:mt-16 pt-6 sm:pt-6 lg:pt-8 border-t border-gray-300">
      {/* code.org */}
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
            "pbl:complete.certificate.internationalAdvisor",
            "International Advisor"
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
              {t("pbl:complete.certificate.junyiAcademy")}
            </p>
          </div>
        </div>
        <p className="text-xs sm:text-xs text-gray-500">
          {t("pbl:complete.certificate.provider")}
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
              {t("pbl:complete.certificate.aiSquare")}
            </p>
          </div>
        </div>
        <p className="text-xs sm:text-xs text-gray-500">
          {t("pbl:complete.certificate.platform")}
        </p>
      </div>
    </div>
  );
}

interface PrintCertificateProps {
  editableName: string;
  scenarioTitle: string;
  completionDate: string;
  t: ReturnType<typeof useTranslation>["t"];
}

function PrintCertificate({
  editableName,
  scenarioTitle,
  completionDate,
  t,
}: PrintCertificateProps) {
  return (
    <div className="certificate-print hidden">
      <div className="certificate-print-content">
        <div className="certificate-corner certificate-corner-tl"></div>
        <div className="certificate-corner certificate-corner-tr"></div>
        <div className="certificate-corner certificate-corner-bl"></div>
        <div className="certificate-corner certificate-corner-br"></div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
          }}
        >
          <div style={{ width: "100%", textAlign: "center" }}>
            {/* Title */}
            <div style={{ marginBottom: "12px" }}>
              <h2
                style={{
                  fontSize: "32px",
                  fontFamily: "serif",
                  fontWeight: "bold",
                  color: "rgb(147, 51, 234)",
                  marginBottom: "8px",
                }}
              >
                {t("pbl:complete.certificate.title")}
              </h2>
              <div
                style={{
                  width: "80px",
                  height: "2px",
                  background: "rgb(147, 51, 234)",
                  margin: "0 auto",
                }}
              ></div>
            </div>

            {/* Certifies text */}
            <div style={{ marginBottom: "10px" }}>
              <p style={{ fontSize: "14px", color: "rgb(55, 65, 81)" }}>
                {t("pbl:complete.certificate.certifies")}
              </p>
            </div>

            {/* Student name */}
            <div style={{ marginBottom: "10px" }}>
              <div
                style={{
                  display: "inline-block",
                  border: "2px solid rgb(167, 139, 250)",
                  padding: "6px 28px",
                  background: "white",
                }}
              >
                <p
                  style={{
                    fontSize: "22px",
                    fontFamily: "serif",
                    fontWeight: "bold",
                    color: "rgb(17, 24, 39)",
                  }}
                >
                  {editableName ||
                    t("pbl:complete.certificate.enterYourName", "Name")}
                </p>
              </div>
            </div>

            {/* Has completed */}
            <div style={{ marginBottom: "10px" }}>
              <p style={{ fontSize: "14px", color: "rgb(55, 65, 81)" }}>
                {t("pbl:complete.certificate.hasCompleted")}
              </p>
            </div>

            {/* Scenario title */}
            <div style={{ marginBottom: "12px" }}>
              <div
                style={{
                  display: "inline-block",
                  background: "rgb(243, 232, 255)",
                  border: "2px solid rgb(216, 180, 254)",
                  padding: "10px 20px",
                  borderRadius: "4px",
                }}
              >
                <p
                  style={{
                    fontSize: "18px",
                    fontWeight: "600",
                    color: "rgb(88, 28, 135)",
                  }}
                >
                  {scenarioTitle}
                </p>
              </div>
            </div>

            {/* Course type */}
            <div style={{ marginBottom: "12px" }}>
              <p style={{ fontSize: "13px", color: "rgb(75, 85, 99)" }}>
                {t("pbl:complete.certificate.courseType")}
              </p>
            </div>

            {/* Date */}
            <div style={{ marginBottom: "18px" }}>
              <p
                style={{
                  fontSize: "13px",
                  color: "rgb(75, 85, 99)",
                  marginBottom: "6px",
                }}
              >
                {t("pbl:complete.certificate.completionDate")}
              </p>
              <p
                style={{
                  fontSize: "16px",
                  fontWeight: "600",
                  color: "rgb(17, 24, 39)",
                }}
              >
                {completionDate}
              </p>
            </div>

            {/* Print footer with logos */}
            <PrintCertificateFooter t={t} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PrintCertificateFooter({
  t,
}: {
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const logoStyle = {
    borderTop: "2px solid rgb(156, 163, 175)",
    paddingTop: "8px",
    marginBottom: "4px",
  };

  const logoWrapperStyle = {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
    marginBottom: "4px",
  };

  const imgContainerStyle = {
    height: "24px",
    display: "flex",
    alignItems: "center",
  };

  const imgStyle = {
    objectFit: "contain" as const,
    display: "block",
    height: "100%",
    width: "auto",
  };

  const labelStyle = {
    fontSize: "11px",
    fontWeight: "600" as const,
    color: "rgb(55, 65, 81)",
  };

  const subtitleStyle = {
    fontSize: "9px",
    color: "rgb(107, 114, 128)",
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: "20px",
        paddingTop: "12px",
        borderTop: "1px solid rgb(209, 213, 219)",
        marginTop: "12px",
      }}
    >
      {/* code.org */}
      <div style={{ textAlign: "center" }}>
        <div style={logoStyle}>
          <div style={logoWrapperStyle}>
            <div style={imgContainerStyle}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/HourAI_Logo_Stacked_Black.png"
                alt="code.org Logo"
                style={imgStyle}
              />
            </div>
            <p style={labelStyle}>code.org</p>
          </div>
        </div>
        <p style={subtitleStyle}>
          {t(
            "pbl:complete.certificate.internationalAdvisor",
            "International Advisor"
          )}
        </p>
      </div>

      {/* Junyi Academy */}
      <div style={{ textAlign: "center" }}>
        <div style={logoStyle}>
          <div style={logoWrapperStyle}>
            <div style={imgContainerStyle}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/junyi_logo.jpg"
                alt="Junyi Academy Logo"
                style={imgStyle}
              />
            </div>
            <p style={labelStyle}>
              {t("pbl:complete.certificate.junyiAcademy")}
            </p>
          </div>
        </div>
        <p style={subtitleStyle}>{t("pbl:complete.certificate.provider")}</p>
      </div>

      {/* AI Square */}
      <div style={{ textAlign: "center" }}>
        <div style={logoStyle}>
          <div style={logoWrapperStyle}>
            <div style={imgContainerStyle}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/logo.png" alt="AI Square Logo" style={imgStyle} />
            </div>
            <p style={labelStyle}>{t("pbl:complete.certificate.aiSquare")}</p>
          </div>
        </div>
        <p style={subtitleStyle}>{t("pbl:complete.certificate.platform")}</p>
      </div>
    </div>
  );
}
