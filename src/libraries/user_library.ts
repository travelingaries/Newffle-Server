import {RowDataPacket} from "mysql";
import {datetimeString} from "./time_library";
import {subscribeTokensToTopic, subscribeToOSAndroidTopic, unsubscribeTokensFromTopic} from "./push_library";

const { pool } = require('../helpers/database');

/**
 * 유저가 새 FCM 토큰 발급받은 경우, 관심 분야 푸시 구독
 * @param fcmToken
 */
export async function subscribeUserFcmTokensToTopics(userIdx:number, fcmTokens: string[]) {
    if(fcmTokens.length < 1) {
        return;
    }
    const pushOn = await getUserPushOnOff(userIdx);
    if(!pushOn) {
        return;
    }
    const categorySubscriptions = await getUserCategorySubscriptionData(userIdx);
    for(const optionIndex in categorySubscriptions.categoryNotifications) {
        if(categorySubscriptions.categoryNotifications[optionIndex] != 0) {
            await subscribeTokensToTopic(categorySubscriptions.topics[optionIndex], fcmTokens);
        }
    }
}

export async function unsubscribeUserFcmTokensFromTopics(userIdx:number, fcmTokens: string[]) {
    if(fcmTokens.length < 1) {
        return;
    }
    const categorySubscriptions = await getUserCategorySubscriptionData(userIdx);
    for(const optionIndex in categorySubscriptions.categoryNotifications) {
        if(categorySubscriptions.categoryNotifications[optionIndex] != 0) {
            await unsubscribeTokensFromTopic(categorySubscriptions.topics[optionIndex], fcmTokens);
        }
    }
}

/**
 * 유저의 정기 구독 정보를 확인하는 함수
 */
export async function getUserCurrentPlan(userIdx:number) {
    let searchUserCurrentPlanSql = "SELECT * FROM `user_current_plan` WHERE `status`=1 AND `user_idx`=? LIMIT 1";
    try {
        const [queryResult] = await pool.promise().query(searchUserCurrentPlanSql, [userIdx]);
        if(!queryResult[0]) {
            return -1;
        } else {
            return queryResult[0].plan;
        }
    } catch(err) {
        console.error(err.message);
        throw err;
    }
}

/**
 * 유저 푸시 전체를 받을지 말지 설정을 조회
 * @param userIdx number
 * @return number
 */
export async function getUserPushOnOff(userIdx:number):Promise<number> {
    let searchUserPushOnSql = "SELECT * FROM `users` WHERE `idx`=?";
    try {
        const [queryResult] = await pool.promise().query(searchUserPushOnSql, [userIdx]);
        if(!queryResult[0]) {
            console.error('no user found');
            return -1;
        } else {
            return queryResult[0].push_on;
        }
    } catch(err) {
        console.error(err.message);
        throw err;
    }
}

export async function saveUserMarketingConsent(userIdx:number, consent:boolean) {
    const consentInt = consent ? 1 : 0;
    let searchMarketingConsentSql = "SELECT * FROM `marketing_consent` WHERE `user_idx`=?";
    try {
        const [queryResult] = await pool.promise().query(searchMarketingConsentSql, [userIdx]);
        if(!queryResult[0]) {
            let insertMarketingConsentSql = "INSERT INTO `marketing_consent`(`user_idx`, `consent`) VALUES (?, ?)";
            try {
                const [insertResult] = await pool.promise().query(insertMarketingConsentSql, [userIdx, consentInt]);
            } catch(err) {
                console.error(err.message);
                throw err;
            }
        } else {
            if(queryResult[0].consent != consentInt) {
                let updateMarketingConsentSql = "UPDATE `marketing_consent` SET `consent`=? WHERE `user_idx`=?";
                try {
                    const [updateResult] = await pool.promise().query(updateMarketingConsentSql, [consentInt, userIdx]);
                } catch(err) {
                    console.error(err.message);
                    throw err;
                }
            }
        }
    } catch(err) {
        console.error(err.message);
        throw err;
    }
}

/**
 * 유저가 푸시 전체를 받을지 말지 설정을 저장
 * @param userIdx
 */
export async function setUserPushOnOff(userIdx:number, pushOn:number) {
    let updateUserPushOnSql = "UPDATE `users` SET `push_on`=? WHERE `idx`=?";
    try {
        const updateResult = await pool.promise().query(updateUserPushOnSql, [pushOn, userIdx]);
        if(updateResult[0].affectedRows > 0) {
            return true;
        }
    } catch(err) {
        console.error(err.message);
        throw err;
    }
}

/**
 * 유저의 카테고리별  전체를 받을지 말지 설정을 조회
 * @param userIdx number
 * @return number
 */
export async function getUserCategorySubscriptionData(userIdx:number) {
    let searchUserSubscriptionData = "SELECT DISTINCT `category`, `fcm_topic`, `notification_option` FROM `user_category_subscriptions` JOIN `news_categories` ON `news_categories`.`idx`=`user_category_subscriptions`.`category_idx` WHERE `user_idx`=? AND `news_categories`.`status`=1";
    try {
        const [queryResults] = await pool.promise().query(searchUserSubscriptionData, [userIdx]);
        let categories:string[] = [];
        let topics:string[] = [];
        let categoryNotifications:number[] = [];
        queryResults.forEach((result:RowDataPacket) => {
            if(result.category != null && result.category != '') {
                categories.push(result.category);
            }
            if(result.fcm_topic != null && result.fcm_topic != '') {
                topics.push(result.fcm_topic);
            }
            if(result.notification_option != null) {
                categoryNotifications.push(result.notification_option);
            }
        })
        return {
            'categories': categories,
            'topics': topics,
            'categoryNotifications': categoryNotifications,
        };
    } catch(err) {
        console.error(err.message);
        throw err;
    }
}

/**
 * 유저가 각 카테고리별로 푸시 알림을 받을지 말지 설정을 저장
 * @param userIdx
 * @param categoryIdx
 * @param notificationOn
 */
export async function setUserCategoryNotificationOption(userIdx:number, categoryIdx:number, notificationOption:number) {
    let updateCategoryNotificationSql = "UPDATE `user_category_subscriptions` SET `notification_option`=? WHERE `user_idx`=? AND `category_idx`=?";
    try {
        const updateResult = await pool.promise().query(updateCategoryNotificationSql, [notificationOption, userIdx, categoryIdx]);
        if(updateResult[0].affectedRows > 0) {
            return true;
        }
    } catch(err) {
        console.error(err.message);
        throw err;
    }
}

/**
 * 유저가 뉴스 읽음 처리
 */
export async function insertReadLog(userIdx:number, articleType:string, articleIdx:number) {
    let insertReadLogSql = "INSERT INTO `user_view_logs`(`user_idx`, `article_type`, `article_idx`) VALUES (?, ?, ?)";
    try {
        const insertResult = await pool.promise().query(insertReadLogSql, [userIdx, articleType, articleIdx]);
        return insertResult[0].insertId;
    } catch(err) {
        console.error(err.message);
        throw err;
    }
}