import { Navbar } from "@/components/navigation/Navbar";
import { Footer } from "@/components/navigation/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { ValueProposition } from "@/components/landing/ValueProposition";
import { FeatureHighlights } from "@/components/landing/FeatureHighlights";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { TargetAudience } from "@/components/landing/TargetAudience";

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
      </main>
      <Footer />
    </>
  );
}
