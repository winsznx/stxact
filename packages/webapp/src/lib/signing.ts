export async function signWithWallet(message: string): Promise<string> {
  const { openSignatureRequestPopup } = await import('@stacks/connect');

  return new Promise((resolve, reject) => {
    openSignatureRequestPopup({
      message,
      network:
        process.env.NEXT_PUBLIC_STACKS_NETWORK === 'mainnet'
          ? 'mainnet'
          : 'testnet',
      appDetails: {
        name: 'stxact',
        icon:
          typeof window !== 'undefined'
            ? `${window.location.origin}/favicon.ico`
            : '/favicon.ico',
      },
      onFinish: (data: { signature: string }) => {
        if (!data.signature) {
          reject(new Error('Wallet did not return a signature'));
          return;
        }
        resolve(data.signature);
      },
      onCancel: () => reject(new Error('Signature request cancelled')),
    });
  });
}
