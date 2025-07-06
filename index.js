import express from 'express';
import admin from 'firebase-admin';

// Read service account JSON from environment variable
const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();
const PORT = process.env.PORT || 3000;

// Health check route
app.get('/', (req, res) => {
  res.send('✅ Notification server is running!');
});

// Inactive user check route
app.get('/send-inactive-notifications', async (req, res) => {
  try {
    const db = admin.firestore();
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
          // Optionally log this or ignore it silently
        }
      }
    }

    res.send(`✅ Notifications sent to ${count} inactive users`);
  } catch (error) {
    console.error('❌ Error sending notifications');
    res.status(500).send('Failed to send notifications');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
});
