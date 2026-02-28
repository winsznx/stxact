import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { appNavbarLinks } from "@/lib/navigation";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1">
                <Navbar links={appNavbarLinks} showDesktopLinks={false} />
                {children}
            </main>
        </div>
    );
}
