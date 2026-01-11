"use client";

export function FeatureHighlights() {
  const features = [
    {
      title: "Structured Curriculum",
      description:
        "Progress through Assessment, Project-Based Learning, and Discovery modes with clear milestones.",
      bgColor: "bg-primary-blue-500",
      textColor: "text-white",
      position: "top-left",
    },
    {
      title: "Real-Time Analytics",
      description:
        "Track your learning journey with comprehensive progress metrics and insights.",
      bgColor: "bg-neutral-cardBg",
      textColor: "text-neutral-textPrimary",
      position: "top-right",
    },
    {
      title: "Flexible Learning Paths",
      description:
        "Choose from multiple modes designed for different learning styles and goals.",
      bgColor: "bg-neutral-cardBg",
      textColor: "text-neutral-textPrimary",
      position: "bottom-left",
    },
    {
      title: "Community Interaction",
      description:
        "Connect with peers, share insights, and grow together in a supportive environment.",
      bgColor: "bg-secondary-orange-500",
      textColor: "text-white",
      position: "bottom-right",
    },
  ];

  return (
    <section className="py-20 px-4 bg-white dark:bg-dark-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-h1 font-bold text-neutral-textPrimary dark:text-dark-text-primary mb-4">
            Features That Empower
          </h2>
          <p className="text-body text-neutral-textSecondary dark:text-dark-text-secondary max-w-2xl mx-auto">
            Everything you need to master AI literacy in one integrated
            platform.
          </p>
        </div>

        {/* 2x2 Bento Grid with X pattern */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {features.map((feature, index) => {
            const isDarkBgFeature = feature.bgColor === "bg-primary-blue-500" || feature.bgColor === "bg-secondary-orange-500";
            const cardClasses = isDarkBgFeature
              ? `${feature.bgColor} ${feature.textColor}`
              : `${feature.bgColor} dark:bg-dark-background-elevated ${feature.textColor} dark:text-dark-text-primary`;

            return (
              <div
                key={index}
                className={`${cardClasses} rounded-card p-8 transition-transform hover:scale-105`}
              >
                <h3 className="text-h3 font-semibold mb-4">{feature.title}</h3>
                <p className="text-body opacity-90">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
