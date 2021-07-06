import * as admin from 'firebase-admin';
let serviceAccount = require('../config/firebase.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

export default admin;