export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-dark text-white/50 border-t border-white/5 py-8 px-6 md:px-12" id="aileng-footer">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm font-light">
        
        {/* Left Copy */}
        <div className="select-none text-white/40">
          2024® AILENG Allright Reserved
        </div>

        {/* Right Links */}
        <div className="flex items-center gap-6 text-white/40">
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
