import { db } from '../db/connection.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function testLogin() {
  try {
    const email = 'jang@neasonline.no';
    const password = 'test123';

    console.log(`Testing login for: ${email}`);
    console.log(`Password: ${password}\n`);

    // Get user
    const [user] = await db.select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      console.log('❌ User not found!');
      process.exit(1);
    }

    console.log('✅ User found:');
    console.log(`  Email: ${user.email}`);
    console.log(`  Account Status: ${user.account_status}`);
    console.log(`  Password Hash: ${user.password_hash}\n`);

    // Test password
    console.log('Testing password with bcrypt.compare...');
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (isValid) {
      console.log('✅ Password is VALID!');
    } else {
      console.log('❌ Password is INVALID!');

      // Try to hash the password and see what we get
      console.log('\nTesting hash generation:');
      const testHash = await bcrypt.hash(password, 12);
      console.log(`  New hash: ${testHash}`);
      const testCompare = await bcrypt.compare(password, testHash);
      console.log(`  New hash validates: ${testCompare}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testLogin();
