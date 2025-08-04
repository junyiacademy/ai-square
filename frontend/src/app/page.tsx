import HeroSection from '@/components/homepage/HeroSection';
import FeaturesSection from '@/components/homepage/FeaturesSection';
import KnowledgeGraph from '@/components/homepage/KnowledgeGraph';
import HowItWorksSection from '@/components/homepage/HowItWorksSection';
import TargetAudienceSection from '@/components/homepage/TargetAudienceSection';
import CTASection from '@/components/homepage/CTASection';

export default function Home() {
  return (
    <main className="min-h-screen">
      <HeroSection />
      <FeaturesSection />
      
      <section className="py-20 bg-gray-50" data-testid="knowledge-graph-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <KnowledgeGraph />
        </div>
      </section>
      
      <HowItWorksSection />
      <TargetAudienceSection />
      <CTASection />
    </main>
  )
}
