export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-none focus:border focus:border-accent focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium"
    >
      Skip to main content
    </a>
  );
}
