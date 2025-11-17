/**
 * Set user as admin
 */

import { db } from '../db/connection.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

async function setAdminRole() {
  try {
    const email = 'jang@neasonline.no';

    console.log(`Setting admin role for ${email}...`);

    const result = await db
      .update(users)
      .set({ role: 'admin' })
      .where(eq(users.email, email))
      .returning({ id: users.id, email: users.email, role: users.role });

    if (result.length > 0) {
      console.log('✅ User updated to admin:', result[0]);
    } else {
      console.log('❌ User not found');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

setAdminRole();
