import { db } from '../db/connection.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

async function checkUser() {
  try {
    const email = 'jang@neasonline.no';
    console.log(`Checking user with email: ${email}\n`);

    const user = await db.select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (user.length === 0) {
      console.log('❌ User not found!');
      process.exit(1);
    }

    const userData = user[0];
    console.log('✅ User found:');
    console.log(`  ID: ${userData.id}`);
    console.log(`  Email: ${userData.email}`);
    console.log(`  Username: ${userData.username}`);
    console.log(`  First Name: ${userData.first_name}`);
    console.log(`  Last Name: ${userData.last_name}`);
    console.log(`  Account Status: ${userData.account_status}`);
    console.log(`  Email Verified: ${userData.email_verified}`);
    console.log(`  Password Hash: ${userData.password_hash?.substring(0, 20)}...`);
    console.log(`  Total Logins: ${userData.total_logins}`);
    console.log(`  Last Login: ${userData.last_login}`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUser();
