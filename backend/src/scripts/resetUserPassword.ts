import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';

async function resetUserPassword(email: string, newPassword: string) {
  try {
    console.log(`Looking for user with email: ${email}`);
    
    // Find user
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (userResult.length === 0) {
      console.log('❌ User not found');
      return;
    }

    const user = userResult[0];
    console.log(`✅ Found user: ${user.email} (ID: ${user.id})`);
    console.log(`Current password hash: ${user.password_hash?.substring(0, 20)}...`);

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    console.log(`New password hash: ${hashedPassword.substring(0, 20)}...`);

    // Update password
    await db
      .update(users)
      .set({
        password_hash: hashedPassword,
        password_reset_token: null,
        password_reset_expires: null,
        updated_at: new Date()
      })
      .where(eq(users.id, user.id));

    console.log(`✅ Password updated successfully for ${email}`);
    console.log(`🔑 New password: ${newPassword}`);

    // Verify the new password works
    const verifyResult = await bcrypt.compare(newPassword, hashedPassword);
    console.log(`🔍 Password verification: ${verifyResult ? '✅ SUCCESS' : '❌ FAILED'}`);

  } catch (error) {
    console.error('❌ Error resetting password:', error);
  }
}

// Get email and password from command line arguments
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.log('Usage: tsx resetUserPassword.ts <email> <password>');
  console.log('Example: tsx resetUserPassword.ts jang@neasonline.no newpassword123');
  process.exit(1);
}

resetUserPassword(email, password).then(() => {
  console.log('Script completed');
  process.exit(0);
});