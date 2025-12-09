import Link from 'next/link';
import Image from 'next/image';

export function Logo() {
  return (
    <div className="flex-shrink-0">
      <Link href="/" className="flex items-center">
        <Image
          src="/images/logo.png"
          alt="AI Square Logo"
          width={32}
          height={32}
          className="mr-3"
          priority
        />
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          AI Square
        </h1>
      </Link>
    </div>
  );
}
