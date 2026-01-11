"use client";

export function Footer() {
  const footerSections = [
    {
      title: "Product",
      links: [
        { label: "Features", href: "#features" },
        { label: "Programs", href: "#programs" },
        { label: "Pricing", href: "#pricing" },
        { label: "Roadmap", href: "#roadmap" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About Us", href: "#about" },
        { label: "Team", href: "#team" },
        { label: "Careers", href: "#careers" },
        { label: "Contact", href: "#contact" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Documentation", href: "#docs" },
        { label: "Blog", href: "#blog" },
        { label: "Community", href: "#community" },
        { label: "Support", href: "#support" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy", href: "#privacy" },
        { label: "Terms", href: "#terms" },
        { label: "Security", href: "#security" },
        { label: "Cookies", href: "#cookies" },
      ],
    },
  ];

  return (
    <footer className="bg-primary-blue-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-h4 font-semibold mb-4">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-small text-white/70 hover:text-white transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Section */}
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-small text-white/70">
            © 2026 AI Square by Junyi Academy. All rights reserved.
          </div>
          <div className="text-small text-white/70 italic">
            Designed with{" "}
            <span className="text-secondary-orange-500">humanity</span>.
          </div>
        </div>
      </div>
    </footer>
  );
}
