"use client";

export function TargetAudience() {
  const personas = [
    {
      title: "Educators",
      tagColor: "bg-secondary-orange-500",
      description:
        "Integrate AI literacy into your curriculum and empower students with future-ready skills.",
      quote: "Transform your classroom with AI-powered learning experiences.",
    },
    {
      title: "Engineers",
      tagColor: "bg-primary-blue-500",
      description:
        "Deepen your technical understanding of AI systems and apply them to solve complex problems.",
      quote: "Build the next generation of AI applications with confidence.",
    },
    {
      title: "Students",
      tagColor: "bg-gradient-tech-to-human",
      description:
        "Develop practical AI skills that prepare you for academic success and career opportunities.",
      quote: "Start your AI journey with hands-on projects and expert guidance.",
    },
  ];

  return (
    <section className="py-20 px-4 bg-white dark:bg-dark-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-h1 font-bold text-neutral-textPrimary dark:text-dark-text-primary mb-4">
            Who We Serve
          </h2>
          <p className="text-body text-neutral-textSecondary dark:text-dark-text-secondary max-w-2xl mx-auto">
            AI Square is designed for learners at every stage of their AI
            journey.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {personas.map((persona, index) => (
            <div
              key={index}
              className="bg-neutral-cardBg dark:bg-dark-background-elevated rounded-card overflow-hidden transition-transform hover:scale-105 hover:shadow-cardHover"
            >
              {/* Image Placeholder */}
              <div className="aspect-[4/3] bg-gradient-blue-radial dark:bg-gradient-to-br dark:from-primary-blue-900/30 dark:to-transparent flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto bg-white/20 dark:bg-black/20 backdrop-blur rounded-full flex items-center justify-center mb-4">
                    <svg
                      className="w-10 h-10 text-primary-blue-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <div>
                  <span
                    className={`${persona.tagColor} text-white text-small font-semibold px-3 py-1 rounded-full`}
                  >
                    {persona.title}
                  </span>
                </div>
                <p className="text-body text-neutral-textSecondary dark:text-dark-text-secondary">
                  {persona.description}
                </p>
                <p className="text-small text-neutral-textSecondary dark:text-dark-text-secondary italic border-l-4 border-primary-blue-500 pl-4">
                  &quot;{persona.quote}&quot;
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
