import Link from 'next/link';

export interface ScenarioHeaderProps {
  title: string;
  breadcrumbLabel: string;
  breadcrumbHref: string;
}

export function ScenarioHeader({ title, breadcrumbLabel, breadcrumbHref }: ScenarioHeaderProps) {
  return (
    <nav className="mb-8">
      <ol className="flex items-center space-x-2 text-sm">
        <li>
          <Link
            href={breadcrumbHref}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {breadcrumbLabel}
          </Link>
        </li>
        <li className="text-gray-400 dark:text-gray-600">/</li>
        <li className="text-gray-900 dark:text-white">{title}</li>
      </ol>
    </nav>
  );
}
