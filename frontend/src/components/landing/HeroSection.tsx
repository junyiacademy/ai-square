"use client";

import { IntersectionEffect } from "@/components/effects/IntersectionEffect";
import { GlassCard } from "@/components/ui/GlassCard";

export function HeroSection() {
  return (
    <IntersectionEffect>
      <section className="min-h-screen flex items-center justify-center px-4 py-20">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Headline & CTAs */}
            <div className="space-y-8">
              <h1 className="text-hero font-bold text-neutral-textPrimary">
                Master{" "}
                <span className="bg-gradient-tech-to-human bg-clip-text text-transparent">
                  AI Square
                </span>
              </h1>
              <p className="text-h3 text-neutral-textSecondary">
                Where{" "}
                <span className="text-primary-blue-500 font-semibold">
                  Technology
                </span>{" "}
                meets{" "}
                <span className="text-secondary-orange-500 font-semibold">
                  Humanity
                </span>
              </p>
              <p className="text-body text-neutral-textSecondary max-w-xl">
                Build AI literacy through structured learning, hands-on
                practice, and community collaboration. Join educators,
                engineers, and students in shaping the future of AI education.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="px-8 py-4 bg-primary-blue-500 text-white font-semibold rounded-pill hover:bg-primary-blue-600 transition-colors shadow-card hover:shadow-cardHover">
                  Get Started
                </button>
                <button className="px-8 py-4 border-2 border-secondary-orange-500 text-secondary-orange-500 font-semibold rounded-pill hover:bg-secondary-orange-50 transition-colors">
                  Explore Programs
                </button>
              </div>
            </div>

            {/* Right Column - Glass Card */}
            <div>
              <GlassCard className="p-8">
                <div className="space-y-6">
                  <div className="aspect-video bg-gradient-blue-radial rounded-card flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <div className="w-16 h-16 mx-auto bg-primary-blue-500 rounded-full flex items-center justify-center">
                        <svg
                          className="w-8 h-8 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                          />
                        </svg>
                      </div>
                      <p className="text-h4 text-neutral-textPrimary font-semibold">
                        Join Our Community
                      </p>
                      <p className="text-small text-neutral-textSecondary">
                        1,000+ learners worldwide
                      </p>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      </section>
    </IntersectionEffect>
  );
}
