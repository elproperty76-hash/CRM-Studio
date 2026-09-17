import { Router } from 'express';
import { getDb } from './firebase-admin';

export const twilioRouter = Router();

// Twilio webhook endpoint for incoming messages
twilioRouter.post('/webhook', async (req, res) => {
  try {
    const db = getDb();
    const { From, Body, MessageSid } = req.body;
    
    // Extract actual phone number from WhatsApp format (e.g. "whatsapp:+628123456789")
    const phoneNumber = From ? From.replace('whatsapp:', '') : '';

    if (!phoneNumber) {
      return res.status(400).send('No sender number found');
    }

    console.log(`Received WhatsApp message from ${phoneNumber}: ${Body}`);

    // Update Customers Collection
    const customersRef = db.collection('customers');
    const customerSnapshot = await customersRef.where('phone', '==', phoneNumber).get();
    
    const timestamp = Date.now();
    const batch = db.batch();
    let updated = false;

    if (!customerSnapshot.empty) {
      customerSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { 
          lastMessageStatus: 'replied',
          lastMessageAt: timestamp
        });
        updated = true;
      });
    }

    // Update Leads Collection (if same number is used in leads)
    const leadsRef = db.collection('leads');
    const leadsSnapshot = await leadsRef.where('phone', '==', phoneNumber).get();

    if (!leadsSnapshot.empty) {
      leadsSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { 
          lastMessageStatus: 'replied',
          lastMessageAt: timestamp
        });
        updated = true;
      });
    }

    if (updated) {
      await batch.commit();
      console.log('Successfully synced WhatsApp reply to Firestore');
    } else {
      console.log('No matching customer or lead found for phone:', phoneNumber);
    }

    // Twilio requires an empty TwiML response to acknowledge receipt
    res.set('Content-Type', 'text/xml');
    res.send('<Response></Response>');
  } catch (error) {
    console.error('Error handling Twilio webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});
