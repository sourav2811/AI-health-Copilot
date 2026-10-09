declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    OPENAI_API_KEY?: string;
    OPENAI_MODEL?: string;
    OPENAI_KEY_CIPHERTEXT?: string;
    OPENAI_KEY_PRIVATE_JWK?: string;
  }
}
