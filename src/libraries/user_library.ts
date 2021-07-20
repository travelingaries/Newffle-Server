import {RowDataPacket} from "mysql";
import {datetimeString} from "./time_library";
import {subscribeTokensToTopic, unsubscribeTokensFromTopic} from "./push_library";

const { pool } = require('../helpers/database');

/**
 * 해당 이메일로 기존에 생성된 계정이 있는지 확인
 */
export async function checkUserExists(email: string) {
    let checkUserExistsSql = "SELECT * FROM `users` WHERE email=?";
    let userExists = false;
    try {
        const [queryResult] = await pool.promise().query(checkUserExistsSql, [email]);
        userExists = Boolean(queryResult[0]);
    } catch(err) {
        console.error(err.message);
        throw err;
    } finally {
        return userExists;
    }
}

/**
 * 유저가 가입/로그인 시 유저의 기기 정보를 저장하는 로직 모음
 * @param userIdx
 * @param data
 */
export async function updateUserDeviceDataFlow(userIdx: number, data: { os: string; version: string; osVersion: string; fcmToken: string; }) {
    const deviceInfoIdx: number = await updateDeviceInfo(userIdx, data.os, data.version, data.osVersion);
    await updateUserDeviceLog(userIdx, deviceInfoIdx);
    await updateUserCurrentDevice(userIdx, deviceInfoIdx, data.fcmToken);
}

/**
 * 유저의 os, 버전, os버전 정보를 저장
 * @param userIdx
 * @param os
 * @param version
 * @param osVersion
 */
export async function updateDeviceInfo(userIdx: number, os: string, version: string, osVersion: string = '') {
    let searchLastDeviceSql = "SELECT * FROM `device_info` WHERE os=? AND version=? AND os_version=? ORDER BY idx DESC";
    try {
        const [queryResult] = await pool.promise().query(searchLastDeviceSql, [os, version, osVersion]);
        if (!queryResult[0]) {
            // 기존에 저장되어 있던 디바이스 정보가 없는 경우 디바이스 정보 새로 저장
            let insertDeviceInfoSql = "INSERT INTO `device_info`(`os`, `version`, `os_version`) VALUES (?, ?, ?)";
            try {
                let insertResult = await pool.promise().query(insertDeviceInfoSql, [os, version, osVersion]);
                return insertResult[0].insertId;
            } catch(err) {
                console.error(err.message);
                throw err;
            }
        } else {
            // 기존에 저장되어 있던 디바이스 정보가 있는 경우에는 디바이스 정보 따로 추가 처리하지 않음
            return queryResult[0].idx;
        }
    } catch(err) {
        console.error(err.message);
        throw err;
    }
}

/**
 * 유저의 접속 기기 로그
 * @param userIdx
 * @param deviceInfoIdx
 */
export async function updateUserDeviceLog(userIdx: number, deviceInfoIdx: number) {
    let searchDeviceLogSql = "SELECT * FROM `user_device_log` WHERE user_idx=? AND device_info_idx=? ORDER BY idx DESC";
    try {
        const [queryResults] = await pool.promise().query(searchDeviceLogSql, [userIdx, deviceInfoIdx]);
        if(!queryResults[0]) {
            // 디바이스 로그가 없는 경우 디바이스 로그 새로 저장
            let insertDeviceLogSql = "INSERT INTO `user_device_log`(`user_idx`, `device_info_idx`) VALUES (?, ?)";
            try {
                const insertResult = await pool.promise().query(insertDeviceLogSql, [userIdx, deviceInfoIdx]);
                return insertResult[0].insertId;
            } catch(err) {
                console.error(err.message);
                throw err;
            }
        } else {
            // 디바이스 로그가 있는 경우 디바이스 로그 업데이트
            let updateDeviceLogSql = "UPDATE `user_device_log` SET `updated_time`=CURRENT_TIMESTAMP() WHERE `idx`=?";
            try {
                const updateResult = await pool.promise().query(updateDeviceLogSql, [queryResults[0].idx]);
                if(updateResult[0].affectedRows > 0) {
                }
                return queryResults[0].idx;
            } catch(err) {
                console.error(err.message);
                throw err;
            }
        }
    } catch(err) {
        console.error(err.message);
        throw err;
    }
}

/**
 * 유저가 가장 최근에 로그인한 기기 정보 업데이트
 * @param userIdx
 * @param deviceInfoIdx
 */
export async function updateUserCurrentDevice(userIdx: number, deviceInfoIdx: number, fcmToken: string) {
    const userCurrentPlan = await getUserCurrentPlan(userIdx);
    let maxDevices = 1;
    switch(userCurrentPlan) {
        case 1:
            maxDevices = 3;
            break;
        case 2:
            maxDevices = 100;
            break;
    }
    maxDevices = 3;
    let searchCurrentDeviceSql = "SELECT idx, device_info_idx, fcm_token" +
        " FROM `user_current_device` WHERE user_idx=? AND STATUS=1 GROUP BY idx ORDER BY updated_time ASC";
    try {
        const [queryResults] = await pool.promise().query(searchCurrentDeviceSql, [userIdx, deviceInfoIdx, fcmToken, userIdx]);
        let activeFcmTokens:string[] = [];
        let deactivatedFcmTokens:string[] = [];
        let idx = -1;
        if (!queryResults[0]) {
            // 유저의 현재 기기 정보가 저장되어 있지 않은 경우 새로 저장
            let insertCurrentDeviceSql = "INSERT INTO `user_current_device`(`user_idx`, `device_info_idx`, `fcm_token`) VALUES (?, ?, ?)";
            try {
                const insertResult = await pool.promise().query(insertCurrentDeviceSql, [userIdx, deviceInfoIdx, fcmToken]);
                idx = insertResult[0].insertId;
                activeFcmTokens.push(fcmToken);
            } catch(err) {
                console.error(err.message);
                throw err;
            }
        } else {
            for(const row of queryResults) {
                activeFcmTokens.push(row.fcm_token);
                if(row.device_info_idx == deviceInfoIdx && row.fcm_token == fcmToken) {
                    idx = row.idx;
                }
            }
            // 유저의 현재 기기 정보가 저장되어 있지 않은 경우 새로 저장
            if(idx == -1) {
                let insertCurrentDeviceSql = "INSERT INTO `user_current_device`(`user_idx`, `device_info_idx`, `fcm_token`) VALUES (?, ?, ?)";
                try {
                    const insertResult = await pool.promise().query(insertCurrentDeviceSql, [userIdx, deviceInfoIdx, fcmToken]);
                    idx = insertResult[0].insertId;
                    activeFcmTokens.push(fcmToken);
                } catch(err) {
                    console.error(err.message);
                    throw err;
                }
            }
            if(activeFcmTokens.length > maxDevices) {
                for(let i = 0; i < activeFcmTokens.length - maxDevices; i++) {
                    let updatePreviousDeviceStatusSql = "UPDATE `user_current_device` SET `status`=0 WHERE `idx`=?";
                    try {
                        const updateResult = await pool.promise().query(updatePreviousDeviceStatusSql, [queryResults[i].idx]);
                        deactivatedFcmTokens.push(queryResults[i].fcm_token);
                    } catch(err) {
                        console.error(err.message);
                        throw err;
                    }
                }
            }
            await unsubscribeUserFcmTokensFromTopics(userIdx, deactivatedFcmTokens.filter(token => token != fcmToken));
        }
        // 새로 FCM 토큰 정보를 저장했다면, 이 새 FCM 토큰도 유저의 관심분야 구독 진행
        if(activeFcmTokens.length > queryResults.length) {
            await subscribeUserFcmTokensToTopics(userIdx, [fcmToken]);
        }
    } catch(err) {
        console.error(err.message);
        throw(err);
    }
}

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

export async function updateUserCurrentPlan(userIdx: number) {
    let searchUserCurrentPlanSql = "SELECT * FROM `user_current_plan` WHERE user_idx=? ORDER BY idx DESC";
    try {
        const [queryResults] = await pool.promise().query(searchUserCurrentPlanSql, [userIdx]);
        if(!queryResults[0]) {
            // 유저의 현재 기기 정보가 저장되어 있지 않은 경우 새로 저장
            let insertUserCurrentPlan = "INSERT INTO `user_current_plan`(`user_idx`, `plan`, `status`, `valid_until`) VALUES (?, ?, ?, ?)";
            let datetime1MonthLater = datetimeString("ISO", {changeMonthBy: 1});
            try {
                const insertResult = await pool.promise().query(insertUserCurrentPlan, [userIdx, 1, 1, datetime1MonthLater]);
                return insertResult[0].insertId;
            } catch(err) {
                throw err;
            }
        }
    } catch(err) {
        console.error(err.message);
        throw err;
    }
}

export async function findUserIdxFromUid(uid:string) {
    let searchUserIdxSql = "SELECT * FROM users WHERE firebase_uid=?";
    try {
        const [queryResult] = await pool.promise().query(searchUserIdxSql, [uid]);
        if(!queryResult[0]) {
            console.error('no user found');
            return -1;
        } else {
            return queryResult[0].idx;
        }
    } catch(err) {
        console.error(err);
        return -1;
    }
}

export async function getUserDataFromUid(uid:string) {
    let searchUserSql = "SELECT * FROM users WHERE firebase_uid=?";
    try {
        const [queryResult] = await pool.promise().query(searchUserSql, [uid]);
        if(!queryResult[0]) {
            console.error('no user found');
            return [];
        } else {
            return queryResult[0];
        }
    } catch(err) {
        console.error(err);
        return -1;
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