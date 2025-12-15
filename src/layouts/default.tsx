import { ThemeSwitch } from "@/components/theme-switch";

export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-col min-h-screen bg-background">
      {/* Minimal Header */}
      <header className="w-full flex items-center justify-end px-6 py-4">
        <ThemeSwitch />
      </header>

      {/* Main Content */}
      <main className="container mx-auto max-w-7xl px-6 flex-grow">
        {children}
      </main>

      {/* Footer */}
      <footer className="w-full flex items-center justify-center py-4">
        <p className="text-default-400 text-sm">
          Ithbat - Authentic Islamic Knowledge Research
        </p>
      </footer>
    </div>
  );
}
