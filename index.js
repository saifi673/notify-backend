import admin from 'firebase-admin';

// Read service account JSON from environment variable
const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function sendNotificationsToInactiveUsers() {
  try {
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;

    const snapshot = await db.collection('users').get();
    let count = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const lastActive = data.lastActive?.toMillis?.() || 0;
      const fcmToken = data.fcmToken;

      if (lastActive < fiveMinutesAgo && fcmToken) {
        try {
          await admin.messaging().send({
            token: fcmToken,
            notification: {
              title: 'We Miss You!',
              body: 'It’s been a while. Come back and continue your journey!',
            },
          });
          count++;
        } catch (sendError) {
          // Log and ignore failed sends
        }
      }
    }

    console.log(`✅ Notifications sent to ${count} inactive users`);
  } catch (error) {
    console.error('❌ Error sending notifications:', error);
  }
}

// Run every 5 minutes
setInterval(sendNotificationsToInactiveUsers, 5 * 60 * 1000);

// Optional: run once at startup too
sendNotificationsToInactiveUsers();

console.log('⏱️ Background worker started...');
