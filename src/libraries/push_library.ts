import * as admin from 'firebase-admin';
let serviceAccount = require('../config/newffle-firebase-adminsdk.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

/**
 * 푸시 전송
 * @param topic 보낼 뉴스의 topic
 * @param data 푸시에 들어갈 정보
 */
export async function sendNewsFcmPush(topic:string, data:{
    category:string,
    news_title:string,
    news_url:string,
}) {
    try {
        const message = {
            notification: {
                title: '[뉴플] ' + data.category + ' 분야 뉴스 알림',
                body: data.news_title,
            },
            android: {notification: {}},
            data: {
                click_action: 'FLUTTER_NOTIFICATION_CLICK',
                news_title: data.news_title,
                news_url: data.news_url,
                type: 'news',
            },
            topic: topic,
        };
        admin.messaging().send(message);
    } catch (err) {
        console.error(err.message);
        throw err;
    }
}

export default {
    sendNewsFcmPush
}