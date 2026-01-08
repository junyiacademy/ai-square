const bcrypt = require("bcryptjs");

async function setupAdmin() {
  const adminEmail = "demo@example.com";
  const adminPassword = "demo123";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  console.log("Admin user setup:");
  console.log("Email:", adminEmail);
  console.log("Password:", adminPassword);
  console.log("Password hash:", passwordHash);
  console.log("\nSQL to create admin user:");
  console.log(`
INSERT INTO users (email, name, role, email_verified, password_hash)
VALUES ('${adminEmail}', 'Demo User', 'admin', true, '${passwordHash}')
ON CONFLICT (email)
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  email_verified = EXCLUDED.email_verified;
  `);
}

setupAdmin();
