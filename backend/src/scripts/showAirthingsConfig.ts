/**
 * Show current Airthings configuration
 */

import { settingsService } from '../services/settings/settingsService.js';

async function showConfig() {
  try {
    const credentials = await settingsService.getAirthingsCredentials();

    console.log('\n=== Airthings Configuration ===');
    console.log('Client ID:', credentials.clientId || '(not set)');
    console.log('Client Secret:', credentials.clientSecret ? '***' + credentials.clientSecret.slice(-4) : '(not set)');
    console.log('Redirect URI:', credentials.redirectUri);
    console.log('\n⚠️  This Redirect URI must EXACTLY match what is in Airthings Dashboard');
    console.log('   Go to: https://dashboard.airthings.com/integrations/api-integration\n');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

showConfig();
