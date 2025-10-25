import * as env from 'env-var';

export const GENAI_API_KEY = env.get('GENAI_API_KEY').required().asString();

export const PDF_RESOURCE_URL = env
  .get('PDF_RESOURCE_URL')
  .required()
  .asString();

export const QDRANT_URL = env.get('QDRANT_URL').required().asString();

export const REDIS_URL = env.get('REDIS_URL').required().asString();

export const COLLECTION_NAME = env
  .get('COLLECTION_NAME')
  .default('gemini-rag')
  .asString();

export const EMBEDDINGS_MODEL = env
  .get('EMBEDDINGS_MODEL')
  .default('gemini-embedding-001')
  .asString();

export const EMBEDDINGS_DIMENSION = env
  .get('EMBEDDINGS_DIMENSION')
  .default('768')
  .asIntPositive();

export const CONTENTS_MODEL = env
  .get('CONTENTS_MODEL')
  .default('gemini-2.5-flash')
  .asString();

export const PROMPT_TEMPLATE = env.get('PROMPT_TEMPLATE').required().asString();

export const ASSISTANT_NAME = env.get('ASSISTANT_NAME').asString();
