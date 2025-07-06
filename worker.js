import admin from 'firebase-admin';

const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function sendNotificationsToInactiveUsers() {
  try {
    const now = Date.now();
    const tenMinutesAgo = now - 10 * 60 * 1000;

    const snapshot = await db.collection('users').get();
    let count = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const lastActive = data.lastActive?.toMillis?.() || 0;
      const fcmToken = data.fcmToken;

      if (lastActive < tenMinutesAgo && fcmToken) {
        await admin.messaging().send({
          token: fcmToken,
          notification: {
            title: 'We Miss You!',
            body: 'It’s been a while. Come back and continue your journey!',
          },
        });
        count++;
      }
    }

    console.log(`✅ Notifications sent to ${count} inactive users`);
  } catch (error) {
    console.error('❌ Worker Error:', error);
  }
}

// Run immediately and then repeat every 10 minutes
sendNotificationsToInactiveUsers();
setInterval(sendNotificationsToInactiveUsers, 10 * 60 * 1000);

console.log('⏱️ Worker started...');
