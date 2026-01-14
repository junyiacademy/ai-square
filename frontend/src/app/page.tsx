/**
 * AI Square Landing Page
 * Redesigned with Junyi Academy brand identity
 * Features: The Intersection (X pattern), The Beam timeline, Glassmorphism
 * Colors: Blue (#0363A7) + Orange (#EC6C1F)
 * Philosophy: Airbnb minimalism + Junyi warmth
 */

import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import ValueProposition from "@/components/landing/ValueProposition";
import FeatureHighlights from "@/components/landing/FeatureHighlights";
import HowItWorks from "@/components/landing/HowItWorks";
import TargetAudience from "@/components/landing/TargetAudience";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import NewsSection from "@/components/landing/NewsSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <HeroSection />
        <ValueProposition />
        <FeatureHighlights />
        <HowItWorks />
        <TargetAudience />
        <TestimonialsSection />
        <NewsSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
