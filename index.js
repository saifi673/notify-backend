import express from 'express';
import admin from 'firebase-admin';

const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('✅ Notification server is running!');
});

app.get('/send-inactive-notifications', async (req, res) => {
  try {
    const db = admin.firestore();
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

    res.send(`✅ Notifications sent to ${count} inactive users`);
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).send('Failed to send notifications');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
});
