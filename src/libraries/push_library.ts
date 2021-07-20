import * as admin from 'firebase-admin';
let serviceAccount = require('../config/firebase.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

export async function subscribeTokensToTopic(topic:string, tokens:string[]) {
    try {
        admin.messaging().subscribeToTopic(tokens, topic);
    } catch(err) {
        console.error(err.message);
        throw err;
    }
}

export async function unsubscribeTokensFromTopic(topic:string, tokens:string[]) {
    try {
        admin.messaging().unsubscribeFromTopic(tokens, topic);
    } catch(err) {
        console.error(err.message);
        throw err;
    }
}