import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { appNavbarLinks } from "@/lib/navigation";

/**
 * Executes logic associated with dashboard layout.
 */
export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <main className="min-w-0 flex-1 overflow-x-hidden">
                <Navbar
                    links={appNavbarLinks}
                    showDesktopLinks={false}
                    showBrand={false}
                    contained={false}
                />
                {children}
            </main>
        </div>
    );
}
