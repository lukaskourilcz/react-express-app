// Minimal game-config for mobile: static shop prices + path-unlock price so the
// ported shop resolves prices the same way the web client does. (The web app
// lets an admin tune these from /dev; mobile ships the defaults.)

export interface GameConfig {
  shop: {
    prices: Record<string, number>;
    pathUnlockPrice: number;
  };
}

const DEFAULT_CONFIG: GameConfig = {
  shop: {
    prices: {},
    pathUnlockPrice: 200,
  },
};

export function getGameConfig(): GameConfig {
  return DEFAULT_CONFIG;
}
