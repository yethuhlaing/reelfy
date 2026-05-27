export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-background text-muted-foreground border-t border-border py-8 px-6 md:px-12" id="aileng-footer">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm font-light">
        
        {/* Left Copy */}
        <div className="select-none text-muted-foreground">
          {currentYear}® AILENG Allright Reserved
        </div>

        {/* Right Links */}
        <div className="flex items-center gap-6 text-muted-foreground">
          <a href="#privacy" className="hover:text-coral transition-colors duration-200">
            Privacy Policy
          </a>
          <span>·</span>
          <a href="#terms" className="hover:text-coral transition-colors duration-200">
            Term & Conditions
          </a>
        </div>

      </div>
    </footer>
  );
}
