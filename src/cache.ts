import KeyvRedis from '@keyv/redis';
import { createCache } from 'cache-manager';
import Keyv from 'keyv';
import { REDIS_URL } from './env';
import ms from 'ms';

export const cache = createCache({
  ttl: ms('5m'),
  stores: [
    new Keyv({
      namespace: 'gemini-rag',
      store: new KeyvRedis(REDIS_URL),
    }),
  ],
});
