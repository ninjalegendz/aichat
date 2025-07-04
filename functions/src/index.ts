
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();
const fcm = admin.messaging();

// This Cloud Function is triggered whenever a ticket document is updated.
export const onTicketNeedsAttention = functions.firestore
  .document("tickets/{ticketId}")
  .onUpdate(async (change) => {
    const before = change.before.data();
    const after = change.after.data();

    // Check if the status changed from something else to "needs-attention"
    if (before.status !== "needs-attention" &&
        after.status === "needs-attention") {
      const customerName = after.customer.name || "A customer";
      const summary = after.summary || "New ticket";

      const payload = {
        notification: {
          title: "Agent Required!",
          body: `${customerName}: ${summary}`,
        },
      };

      // Get all saved FCM tokens for all users
      // A more advanced app might target specific users,
      // but for now, we notify everyone.
      const tokensSnapshot = await db.collectionGroup("tokens").get();
      const tokens = tokensSnapshot.docs.map((doc) => doc.data().token);

      if (tokens.length > 0) {
        functions.logger.log(`Sending notification to ${tokens.length} device(s).`);
        await fcm.sendToDevice(tokens, payload);
      } else {
        functions.logger.log("No FCM tokens found to send notifications.");
      }
    }

    return null;
  });
