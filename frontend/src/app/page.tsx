import HeroSection from "@/components/homepage/HeroSection";
import StatsSection from "@/components/homepage/StatsSection";
import ModesSection from "@/components/homepage/ModesSection";
import HowItWorksSection from "@/components/homepage/HowItWorksSection";
import DomainsSection from "@/components/homepage/DomainsSection";
import CTASection from "@/components/homepage/CTASection";

export default function Home() {
  return (
    <main className="min-h-screen">
      <HeroSection />
      <StatsSection />
      <ModesSection />
      <HowItWorksSection />
      <DomainsSection />
      <CTASection />
    </main>
  );
}
