import bcrypt from 'bcrypt';
import { Request, Response, Router } from 'express';
import StatusCodes from 'http-status-codes';
import { paramMissingError, loginFailedErr, cookieProps } from '@shared/constants';
const { BAD_REQUEST, OK, UNAUTHORIZED } = StatusCodes;

var admin = require('firebase-admin');
var serviceAccount = require('../config/newffle_service_account_key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

var registrationToken = 'fobd8Yf3R-m-W-Z4OT0hNV:APA91bFl1Ro3ImlLnOzHX-NSmoT7VEhEWCic12rT_7-2sebQdvB9WtZQ0mqWPMDCEEXm0WVBfytZptWAKDJCp7OiAn9vyQAgO2FpJIMp5vVqF8SAbNwTFwXIoi_lHNY353SCbvbve002';

export async function sendNotification(req: Request, res: Response) {
    var message = {
        data: {
            title: 'title_test',
            body: 'body_test'
        },
        token: registrationToken
    };

    admin.messaging().send(message).then((response: any) => {
        console.log('successfully sent message: ', response);
    }).catch((error: any) => {
        console.log('Error sending message: ', error);
    });

    // Return
    return res.status(OK).end();
}