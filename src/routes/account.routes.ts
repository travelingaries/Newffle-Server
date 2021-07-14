import {Request, Response, Router} from 'express';
import {Md5} from 'ts-md5/dist/md5';
import {checkUserExists, updateUserCurrentPlan, updateUserDeviceDataFlow} from "../libraries/user_library";

const { pool } = require('../helpers/database');

const accountRouter = Router();

accountRouter.post('/signup', async (req: Request, res: Response) => {
    let data:any = req.body;

    const userExists = await checkUserExists(data.email);
    if(userExists) {
        console.error('user already exists');
        res.sendStatus(401);
    } else {
        let createUserSql = "INSERT INTO `users`(`email`, `password`, `signup_from`, `firebase_uid`) VALUES (?, ?, ?, ?)";

        try {
            const [insertResult] = await pool.promise().query(createUserSql, [
                data.email,
                Md5.hashStr(data.password),
                data.os,
                data.firebaseUid]
            );
            const userIdx: number = insertResult.insertId;
            await updateUserDeviceDataFlow(userIdx, data);
            await updateUserCurrentPlan(userIdx);

            res.sendStatus(200);
        } catch(err) {
            console.error(err.message);
            res.sendStatus(400);
        }
    }
});
accountRouter.post('/login', async (req: Request, res: Response) => {
    let data: any = req.body;
    let loginUserSql = "SELECT * FROM `users` WHERE email=? AND password=?";

    try {
        const [result] = await pool.promise().query(loginUserSql, [data.email, Md5.hashStr(data.password)]);
        if (result[0]) {
            try {
                const userIdx: number = result[0].idx;
                await updateUserDeviceDataFlow(userIdx, data);

                res.sendStatus(200);
            } catch (err) {
                console.error(err.message);
                res.sendStatus(401);
            }
        } else {
            console.error('no user data found');
            res.sendStatus(400);
        }
    } catch (err) {
        console.error(err.message);
        res.sendStatus(400);
    }
});

export default accountRouter;