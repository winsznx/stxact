import { Navbar } from "@/components/Navbar";

export default function MarketingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Use a simplified layout for landing page - full width, no sidebar
    return (
        <div className="flex min-h-screen flex-col bg-background">
            <Navbar />
            <main className="flex-1 w-full">
                {children}
            </main>
        </div>
    );
}
