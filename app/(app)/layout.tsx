import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      {/* Mobile top navbar — hidden on desktop */}
      <div className="lg:hidden">
        <Navbar />
      </div>
      {/* Desktop sidebar — hidden on mobile */}
      <Sidebar />
      {/* Main content — offset by sidebar width on desktop */}
      <main className="lg:pl-60 min-h-screen">
        {children}
      </main>
    </div>
  );
}
