"use client";

export function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Assess",
      description:
        "Discover your current AI knowledge level and identify areas for growth through interactive assessments.",
      dotColor: "bg-primary-blue-500",
    },
    {
      number: "02",
      title: "Learn",
      description:
        "Engage with hands-on projects and structured lessons designed for real-world application.",
      dotColor: "bg-gradient-tech-to-human",
    },
    {
      number: "03",
      title: "Apply",
      description:
        "Put your skills to work on meaningful projects and share your insights with the community.",
      dotColor: "bg-secondary-orange-500",
    },
  ];

  return (
    <section className="py-20 px-4 bg-gradient-blue-radial dark:bg-dark-background-card bg-neutral-cardBg">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-h1 font-bold text-neutral-textPrimary dark:text-white mb-4">
            How It Works
          </h2>
          <p className="text-body text-neutral-textSecondary dark:text-neutral-white/80 max-w-2xl mx-auto">
            A simple three-step journey from assessment to mastery.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Gradient Line */}
          <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-primary-blue-500 via-purple-500 to-secondary-orange-500 hidden md:block" />

          <div className="space-y-12">
            {steps.map((step, index) => (
              <div key={index} className="relative flex items-start gap-8">
                {/* Dot */}
                <div className="relative z-10 flex-shrink-0">
                  <div
                    className={`w-16 h-16 ${step.dotColor} rounded-full flex items-center justify-center text-white font-bold text-h4 shadow-card`}
                  >
                    {step.number}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 pt-2">
                  <h3 className="text-h2 font-bold text-neutral-textPrimary dark:text-white mb-3">
                    {step.title}
                  </h3>
                  <p className="text-body text-neutral-textSecondary dark:text-neutral-white/80 max-w-xl">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
