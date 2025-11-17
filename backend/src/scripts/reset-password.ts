import { db } from '../db/connection.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function resetPassword() {
  try {
    const email = 'jang@neasonline.no';
    const newPassword = 'test123'; // Simple password for testing

    console.log(`Resetting password for: ${email}`);
    console.log(`New password will be: ${newPassword}\n`);

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    console.log(`Password hashed: ${hashedPassword.substring(0, 20)}...\n`);

    // Update the user's password
    const result = await db.update(users)
      .set({
        password_hash: hashedPassword,
        updated_at: new Date()
      })
      .where(eq(users.email, email))
      .returning();

    if (result.length === 0) {
      console.log('❌ User not found!');
      process.exit(1);
    }

    console.log('✅ Password reset successfully!');
    console.log(`\nYou can now login with:`);
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${newPassword}`);
    console.log(`\n⚠️  Remember to change this password after logging in!`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

resetPassword();
