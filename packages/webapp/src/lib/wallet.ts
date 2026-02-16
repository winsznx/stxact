import type { UserSession } from '@stacks/connect';

export interface WalletData {
  address: string;
  network: 'mainnet' | 'testnet';
  profile?: {
    name?: string;
    image?: string;
  };
}

let userSessionInstance: UserSession | null = null;

function getUserSession(): UserSession {
  if (typeof window === 'undefined') {
    throw new Error('Wallet functions can only be used in the browser');
  }

  if (!userSessionInstance) {
    // Browser-only imports - require() needed for SSR compatibility
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AppConfig, UserSession } = require('@stacks/connect');
    const appConfig = new AppConfig(['store_write', 'publish_data']);
    userSessionInstance = new UserSession({ appConfig });
  }

  return userSessionInstance as UserSession;
}

export function connectWallet(): Promise<WalletData> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Wallet functions can only be used in the browser'));
  }

  return new Promise((resolve, reject) => {
    // Browser-only imports - require() needed for SSR compatibility
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { showConnect } = require('@stacks/connect');
    const userSession = getUserSession();

    showConnect({
      appDetails: {
        name: 'stxact',
        icon: '/logo.svg',
      },
      onFinish: () => {
        if (userSession.isUserSignedIn()) {
          const userData = userSession.loadUserData();
          resolve({
            address: userData.profile.stxAddress.mainnet,
            network: 'mainnet',
            profile: {
              name: userData.profile.name,
              image: userData.profile.image?.[0]?.contentUrl,
            },
          });
        } else {
          reject(new Error('User not signed in'));
        }
      },
      onCancel: () => {
        reject(new Error('User cancelled'));
      },
      userSession,
    });
  });
}

export function disconnectWallet(): void {
  if (typeof window === 'undefined') {
    return;
  }
  const userSession = getUserSession();
  userSession.signUserOut();
}

export function getWalletData(): WalletData | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const userSession = getUserSession();
  if (!userSession.isUserSignedIn()) {
    return null;
  }

  const userData = userSession.loadUserData();
  return {
    address: userData.profile.stxAddress.mainnet,
    network: 'mainnet',
    profile: {
      name: userData.profile.name,
      image: userData.profile.image?.[0]?.contentUrl,
    },
  };
}
