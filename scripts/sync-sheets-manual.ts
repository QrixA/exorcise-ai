import dotenv from "dotenv";
dotenv.config();

async function main() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const syncSecret = process.env.ADMIN_SYNC_SECRET;

  if (!syncSecret) {
    console.error("❌ ADMIN_SYNC_SECRET not set in .env");
    process.exit(1);
  }

  console.log(`\n👻 Exorcise AI — Manual Sheet Sync\n${"=".repeat(40)}\n`);
  console.log(`🌐 Target: ${baseUrl}/api/admin/sync-sheets`);
  console.log(`📅 Time: ${new Date().toISOString()}\n`);

  try {
    const res = await fetch(`${baseUrl}/api/admin/sync-sheets`, {
      method: "POST",
      headers: {
        "x-sync-secret": syncSecret,
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();

    if (data.error) {
      console.error(`❌ Sync failed: ${data.error}`);
      process.exit(1);
    }

    console.log(`✅ Sync completed successfully!`);
    console.log(`   📊 Total synced: ${data.synced}`);
    console.log(`   ✨ Created: ${data.created}`);
    console.log(`   🔄 Updated: ${data.updated}`);
    console.log(`   ⏭️  Skipped: ${data.skipped}`);
    console.log(`   🕐 Timestamp: ${data.timestamp}\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`❌ Sync request failed: ${message}`);
    console.error(`   Make sure the server is running at ${baseUrl}`);
    process.exit(1);
  }
}

main();
