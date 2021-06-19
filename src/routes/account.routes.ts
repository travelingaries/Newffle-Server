import {Request, Response, Router} from 'express';
import {Md5} from 'ts-md5/dist/md5';
import {OkPacket, RowDataPacket} from "mysql2";

const { pool } = require('../helpers/database');

const accountRouter = Router();

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
                console.error(err);
                throw err;
            }
        } else {
            // 기존에 저장되어 있던 디바이스 정보가 있는 경우에는 디바이스 정보 따로 추가 처리하지 않음
            return queryResult[0].idx;
        }
    } catch(err) {
        console.error(err);
        throw err;
    }
}
async function updateUserDeviceLog(userIdx: number, deviceInfoIdx: number) {
    let searchDeviceLogSql = "SELECT * FROM `user_device_log` WHERE user_idx=? AND device_info_idx=? ORDER BY idx DESC";
    try {
        const [queryResults] = await pool.promise().query(searchDeviceLogSql, [userIdx, deviceInfoIdx]);
        if(!queryResults[0]) {
            // 디바이스 로그가 없는 경우 디바이스 로그 새로 저장
            let insertDeviceLogSql = "INSERT INTO `user_device_log`(`user_idx`, `device_info_idx`) VALUES (?, ?)";
            try {
                const insertResult = await pool.query(insertDeviceLogSql, [userIdx, deviceInfoIdx]);
                return insertResult[0].insertId;
            } catch(err) {
                console.error(err);
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
                console.error(err);
                throw err;
            }
        }
    } catch(err) {
        console.error(err);
        throw err;
    }
}
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
                console.error(err);
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
                    console.error(err);
                    throw err;
                }
            }
        }
    } catch(err) {
        console.error(err);
        throw(err);
    }
}
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
                console.error(err);
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
                    console.error(err);
                    throw err;
                }
            }
        }
    } catch(err) {
        console.error(err);
        throw(err);
    }
}
accountRouter.post('/signup', async (req: Request, res: Response) => {
    let data:any = req.body;
    let createUserSql = "INSERT INTO `users`(`email`, `password`, `fcm_token`, `signup_from`, `firebase_uid`) VALUES (?, ?, ?, ?, ?)";
    let result: OkPacket;
    try {
        result = await pool.promise().query(createUserSql, [data.email, Md5.hashStr(data.password), data.fcm_token, data.signup_from, data.firebase_uid]);
        console.log(result);
        res.sendStatus(200);
    } catch(err) {
        console.error(err);
        res.sendStatus(400);
    }
});
accountRouter.post('/login', async (req: Request, res: Response) => {
    let data: any = req.body;
    let loginUserSql = "SELECT * FROM `users` WHERE email=? AND password=?";

    try {
        const [result] = await pool.promise().query(loginUserSql, [data.email, Md5.hashStr(data.password)]);
        if (result[0]) {
            try {
                const deviceInfoIdx: number = await updateUserDeviceData(result[0].idx, data.os, data.version, data.osVersion);
                await updateUserDeviceLog(result[0].idx, deviceInfoIdx);
                await updateUserCurrentDevice(result[0].idx, deviceInfoIdx);
                await updateFcmToken(result[0].idx, data.fcmToken, data.os);

                res.sendStatus(200);
            } catch (err) {
                console.error(err);
                throw err;
                res.sendStatus(401);
            }
        } else {
            console.error('no user data found');
            res.sendStatus(400);
        }
    } catch (err) {
        console.error(err.message);
        throw err;
        res.sendStatus(400);
    }
});

export default accountRouter;