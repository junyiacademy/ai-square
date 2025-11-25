import dynamic from 'next/dynamic';
import HeroSection from '@/components/homepage/HeroSection';
import FeaturesSection from '@/components/homepage/FeaturesSection';
import HowItWorksSection from '@/components/homepage/HowItWorksSection';
import TargetAudienceSection from '@/components/homepage/TargetAudienceSection';
import CTASection from '@/components/homepage/CTASection';

// Dynamic import for KnowledgeGraph (contains D3.js - heavy library)
// Loading on client side to reduce initial bundle size
const KnowledgeGraph = dynamic(() => import('@/components/homepage/KnowledgeGraph'), {
  loading: () => (
    <div className="h-[400px] flex items-center justify-center">
      <div className="animate-pulse text-gray-400">Loading visualization...</div>
    </div>
  )
});

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
