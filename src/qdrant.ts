import { QdrantClient } from '@qdrant/js-client-rest';
import { QDRANT_URL } from './env';

export const qdrant = new QdrantClient({ url: QDRANT_URL });
