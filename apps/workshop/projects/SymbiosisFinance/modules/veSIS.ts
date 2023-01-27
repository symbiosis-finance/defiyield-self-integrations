import type { ModuleDefinitionInterface } from '@defiyield/sandbox';
import { ADDRESS } from '../helpers/constants';
import { Address, Pool } from '@defiyield/sandbox';
import erc20Abi from '../../../../../packages/abis/erc20.abi.json';
import veSISAbi from '../abis/veSIS.json';

export const veSIS: ModuleDefinitionInterface = {
  name: 'veSIS',
  chain: 'ethereum',
  type: 'staking',

  /**
   * Fetches the addresses of all involved tokens (supplied, rewards, borrowed, etc)
   *
   * @param context
   * @returns Address[]
   */
  async preloadTokens(ctx): Promise<Address[]> {
    return [ADDRESS.SIS];
  },

  /**
   * Returns full pool list
   *
   * @param context
   * @returns Pool[]
   */
  async fetchPools({ tokens, BigNumber, ethcall, ethcallProvider }): Promise<(Pool | void)[]> {
    const [token] = tokens;
    const sisContract = new ethcall.Contract(ADDRESS.SIS, erc20Abi);
    const [locked] = await ethcallProvider.all<typeof BigNumber>([
      sisContract.balanceOf(ADDRESS.veSIS),
    ]);

    const sisPrice = new BigNumber(token?.price || 0);
    const sisDelimiter = new BigNumber(10).pow(token?.decimals);
    const sisLocked = new BigNumber(locked.toString()).div(sisDelimiter);
    const tvl = sisLocked.multipliedBy(sisPrice);

    return [
      {
        id: 'veSIS',
        supplied: [
          {
            token,
            tvl: tvl.toNumber(),
          },
        ],
      },
    ];
  },

  /**
   * Returns user positions for all pools
   *
   * @param ctx Context
   * @returns UserPosition[]
   */
  async fetchUserPositions({ pools, user, ethcall, ethcallProvider, BigNumber }) {
    const [pool] = pools;
    const { token } = pool.supplied?.[0] || {};
    if (!token) return [];

    const veSisContract = new ethcall.Contract(ADDRESS.veSIS, veSISAbi);
    const [[locked]] = await ethcallProvider.all<typeof BigNumber[][]>([
      veSisContract.locked(user),
    ]);
    const sisDelimiter = new BigNumber(10).pow(token?.decimals);
    const position = new BigNumber(locked.toString()).div(sisDelimiter);

    return [
      {
        id: pool.id,
        supplied: [
          {
            token,
            balance: position.toNumber(),
          },
        ],
      },
    ];
  },
};
