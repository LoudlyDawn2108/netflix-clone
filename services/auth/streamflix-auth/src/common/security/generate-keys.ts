import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Script to generate RSA key pairs for JWT signing and verification
 * Uses RS256 algorithm (RSA + SHA-256) as specified in the requirements
 */

// Configuration
const KEY_SIZE = 2048; // 2048 bits is considered secure for RSA
const KEY_DIR = path.join(__dirname, '../../../', 'keys');
const PRIVATE_KEY_PATH = path.join(KEY_DIR, 'private.key');
const PUBLIC_KEY_PATH = path.join(KEY_DIR, 'public.key');

// Generate RSA key pair
function generateRSAKeyPair(): { privateKey: string; publicKey: string } {
  console.log(`Generating ${KEY_SIZE}-bit RSA key pair...`);

  // Generate keys
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: KEY_SIZE,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  console.log('RSA key pair generated successfully!');
  return { privateKey, publicKey };
}

// Save keys to files
function saveKeysToFiles(privateKey: string, publicKey: string): void {
  // Create the directory if it doesn't exist
  if (!fs.existsSync(KEY_DIR)) {
    console.log(`Creating key directory: ${KEY_DIR}`);
    fs.mkdirSync(KEY_DIR, { recursive: true });
  }

  // Write the keys to files
  console.log(`Writing private key to: ${PRIVATE_KEY_PATH}`);
  fs.writeFileSync(PRIVATE_KEY_PATH, privateKey, { mode: 0o600 }); // Set restricted permissions

  console.log(`Writing public key to: ${PUBLIC_KEY_PATH}`);
  fs.writeFileSync(PUBLIC_KEY_PATH, publicKey);

  console.log('Keys saved to files successfully!');
}

// Main function
function main() {
  try {
    // Check if keys already exist
    if (fs.existsSync(PRIVATE_KEY_PATH) && fs.existsSync(PUBLIC_KEY_PATH)) {
      console.log('Warning: Key files already exist!');
      console.log('To generate new keys, first delete the existing key files.');
      process.exit(1);
    }

    // Generate and save keys
    const { privateKey, publicKey } = generateRSAKeyPair();
    saveKeysToFiles(privateKey, publicKey);

    console.log('\nRS256 key generation complete!');
    console.log('These keys will be used for JWT signing and verification.');
    console.log(`- Private key: ${PRIVATE_KEY_PATH}`);
    console.log(`- Public key: ${PUBLIC_KEY_PATH}`);
  } catch (error) {
    console.error('Error generating RSA key pair:');
    console.error(error);
    process.exit(1);
  }
}

// Run the script if it's called directly
if (require.main === module) {
  main();
}

export { generateRSAKeyPair, saveKeysToFiles };
