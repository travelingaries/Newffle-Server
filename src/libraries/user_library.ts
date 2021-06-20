const { pool } = require('../helpers/database');

/**
 * 해당 이메일로 기존에 생성된 계정이 있는지 확인
 */
export async function checkUserExists(email: String) {
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
export async function updateUserDeviceDataFlow(userIdx: number, data: { os: String; version: String; osVersion: String; fcmToken: String; }) {
    const deviceInfoIdx: number = await updateUserDeviceData(userIdx, data.os, data.version, data.osVersion);
    await updateUserDeviceLog(userIdx, deviceInfoIdx);
    await updateUserCurrentDevice(userIdx, deviceInfoIdx);
    await updateFcmToken(userIdx, data.fcmToken, data.os);
}

/**
 * 유저의 os, 버전, os버전 정보를 저장
 * @param userIdx
 * @param os
 * @param version
 * @param osVersion
 */
async function updateUserDeviceData(userIdx: number, os: String, version: String, osVersion: String = '') {
    let searchLastDeviceSql = "SELECT * FROM `device_info` WHERE os=? AND version=? AND os_version=? ORDER BY idx DESC";
    try {
        const [queryResult] = await pool.promise().query(searchLastDeviceSql, [os, version, osVersion]);
        if (!queryResult[0]) {
            // 기존에 저장되어 있던 디바이스 정보가 없는 경우 디바이스 정보 새로 저장
            let insertDeviceInfoSql = "INSERT INTO `device_info`(`os`, `version`, `os_version`) VALUES (?, ?, ?)";
            try {
                let insertResult = await pool.promise().query(insertDeviceInfoSql, [os, version, osVersion]);
                console.log('device info inserted | idx:', insertResult[0].insertId, '/ os:', os, '/ version:', version, '/ os_version:', osVersion);
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
async function updateUserDeviceLog(userIdx: number, deviceInfoIdx: number) {
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
                    console.log('user_device_log updated | idx:', queryResults[0].idx);
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
async function updateUserCurrentDevice(userIdx: number, deviceInfoIdx: number) {
    let searchCurrentDeviceSql = "SELECT * FROM `user_current_device` WHERE user_idx=? ORDER BY idx DESC";
    try {
        const [queryResults] = await pool.promise().query(searchCurrentDeviceSql, [userIdx]);
        if (!queryResults[0]) {
            // 유저의 현재 기기 정보가 저장되어 있지 않은 경우 새로 저장
            let insertCurrentDeviceSql = "INSERT INTO `user_current_device`(`user_idx`, `device_info_idx`) VALUES (?, ?)";
            try {
                const insertResult = await pool.promise().query(insertCurrentDeviceSql, [userIdx, deviceInfoIdx]);
                console.log('user_current_device inserted | idx:', insertResult[0].insertId);
                return insertResult[0].insertId;
            } catch(err) {
                console.error(err.message);
                throw err;
            }
        } else {
            // 유저의 현재 기기 정보가 이미 저장되어 있는 경우
            if(queryResults[0].device_info_idx != deviceInfoIdx) {
                let updateCurrentDeviceSql = "UPDATE `user_current_device` SET `device_info_idx`=? WHERE `idx`=?";
                try {
                    const updateResult = await pool.promise().query(updateCurrentDeviceSql, [deviceInfoIdx, queryResults[0].idx]);
                    if(updateResult[0].affectedRows > 0) {
                        console.log('user_current_device updated | idx:', queryResults[0].idx);
                    }
                    return queryResults[0].idx;
                } catch(err) {
                    console.error(err.message);
                    throw err;
                }
            }
        }
    } catch(err) {
        console.error(err.message);
        throw(err);
    }
}

/**
 * 유저가 푸시를 받을 fcm 토큰 정보 업데이트
 * @param userIdx
 * @param fcmToken
 * @param os
 */
async function updateFcmToken(userIdx: number, fcmToken: String, os: String) {
    let searchFcmTokenSql = "SELECT * FROM `fcm_token` WHERE user_idx=? ORDER BY idx DESC";
    try {
        const [queryResults] = await pool.promise().query(searchFcmTokenSql, [userIdx]);
        if (!queryResults[0]) {
            // 유저의 현재 기기 정보가 저장되어 있지 않은 경우 새로 저장
            let insertFcmTokenSql = "INSERT INTO `fcm_token`(`user_idx`, `device_token`, `os`) VALUES (?, ?, ?)";
            try {
                const insertResult = await pool.promise().query(insertFcmTokenSql, [userIdx, fcmToken, os]);
                console.log('fcm_token inserted | idx:', insertResult[0].insertId);
                return insertResult[0].insertId;
            } catch(err) {
                console.error(err.message);
                throw err;
            }
        } else {
            // 유저의 현재 기기 정보가 이미 저장되어 있는 경우
            if(queryResults[0].device_token != fcmToken || queryResults[0].os != os) {
                let updateFcmTokenSql = "UPDATE `fcm_token` SET `device_token`=?, `os`=? WHERE `idx`=?";
                try {
                    const updateResult = await pool.promise().query(updateFcmTokenSql, [fcmToken, os, queryResults[0].idx]);
                    if(updateResult[0].affectedRows > 0) {
                        console.log('fcm_token updated | idx:', queryResults[0].idx);
                    }
                    return queryResults[0].idx;
                } catch(err) {
                    console.error(err.message);
                    throw err;
                }
            }
        }
    } catch(err) {
        console.error(err.message);
        throw(err);
    }
}

export default {
    checkUserExists,
    updateUserDeviceDataFlow
}