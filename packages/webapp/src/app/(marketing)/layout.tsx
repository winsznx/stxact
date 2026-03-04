import type { Metadata } from 'next';
import { Navbar } from "@/components/Navbar";
import { marketingNavbarLinks } from "@/lib/navigation";

export const metadata: Metadata = {
    other: {
        "talentapp:project_verification":
            "e4abb6cdf53af84f1133ffbed0496e54c08464d65aa17be5ec28686819eaf28535bdc76c412c4717af27ae3098bcc5a02c2af87124b1f8be387d929bfd17a7e5",
    },
};

export default function MarketingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Use a simplified layout for landing page - full width, no sidebar
    return (
        <div className="flex min-h-screen flex-col bg-background">
            <Navbar links={marketingNavbarLinks} />
            <main className="flex-1 w-full">
                {children}
            </main>
        </div>
    );
}
