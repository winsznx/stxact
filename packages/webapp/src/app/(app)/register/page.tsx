import { RegisterServiceForm } from '@/components/RegisterServiceForm';

/**
 * Executes logic associated with register page.
 */
export default function RegisterPage() {
    return (
        <div className="min-h-screen bg-background">
            <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="font-serif text-4xl font-bold">Register Your Service</h1>
                    <p className="mt-3 text-lg text-foreground-muted">
                        Join the stxact network and start accepting cryptographically verifiable payments
                    </p>
                </div>

                <RegisterServiceForm />

                <div className="mt-8 glass rounded-none p-6">
                    <h3 className="font-serif text-lg font-semibold">Requirements</h3>
                    <ul className="mt-3 space-y-2 text-sm text-foreground-muted">
                        <li className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>Minimum stake of 100 STX (locked in contract)</span>
                        </li>
                        <li className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>Valid HTTPS endpoint for your service</span>
                        </li>
                        <li className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>SHA-256 hash of your service policy document</span>
                        </li>
                        <li className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>Connected Stacks wallet with sufficient balance</span>
                        </li>
                    </ul>
                </div>

                <div className="mt-6 glass rounded-none p-6">
                    <h3 className="font-serif text-lg font-semibold">What happens next?</h3>
                    <ol className="mt-3 space-y-2 text-sm text-foreground-muted">
                        <li className="flex items-start">
                            <span className="mr-2 font-semibold">1.</span>
                            <span>Your service is registered in the backend database</span>
                        </li>
                        <li className="flex items-start">
                            <span className="mr-2 font-semibold">2.</span>
                            <span>An on-chain transaction is created and broadcast</span>
                        </li>
                        <li className="flex items-start">
                            <span className="mr-2 font-semibold">3.</span>
                            <span>Your stake is locked in the service registry contract</span>
                        </li>
                        <li className="flex items-start">
                            <span className="mr-2 font-semibold">4.</span>
                            <span>Your service appears in the directory once confirmed</span>
                        </li>
                    </ol>
                </div>
            </div>
        </div>
    );
}
