// Simple script to hash passwords for demo users
const crypto = require('crypto');

function hashPassword(password) {
  // Simple SHA-256 hash for demo purposes
  // In production, use bcrypt or argon2
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Demo user passwords
const passwords = {
  'student@example.com': 'student123',
  'teacher@example.com': 'teacher123',
  'admin@example.com': 'admin123'
};

console.log('Demo user password hashes:');
console.log('========================');
for (const [email, password] of Object.entries(passwords)) {
  const hash = hashPassword(password);
  console.log(`${email}: ${password} -> ${hash}`);
}

// Generate SQL update statements
console.log('\nSQL Update statements:');
console.log('=====================');
for (const [email, password] of Object.entries(passwords)) {
  const hash = hashPassword(password);
  console.log(`UPDATE users SET metadata = jsonb_set(metadata, '{password_hash}', '"${hash}"') WHERE email = '${email}';`);
}