import {Request, Response, Router} from 'express';
import {Md5} from 'ts-md5/dist/md5';

// connect with mysql rdb
import mysql, {Pool, PoolConnection} from 'mysql';
import dbconfig from '../config/dbconfig.json';
const pool:Pool = mysql.createPool(dbconfig);
import {OkPacket, RowDataPacket} from "mysql";

const accountRouter = Router();

accountRouter.post('/account/signup', (req: Request, res: Response) => {
    let data:any = req.body;
    console.log(data);
    let create_user_sql = "INSERT INTO `users`(`email`, `password`, `fcm_token`, `signup_from`, `firebase_uid`) VALUES (?, ?, ?, ?, ?)";
    pool.query(create_user_sql, [data.email, Md5.hashStr(data.password), data.fcm_token, data.signup_from, data.firebase_uid], (err, results:OkPacket, fields) => {
        if (err) {
            console.error(err.message);
            res.sendStatus(400);
        }
        console.log(results);
        res.sendStatus(200);
    });
});
accountRouter.post('/account/login', (req: Request, res: Response) => {
    let data:any = req.body;
    console.log(data);
    let login_user_sql = "SELECT * FROM `users` WHERE email=? AND password=?";
    pool.query(login_user_sql, [data.email, Md5.hashStr(data.password)], (err, results:RowDataPacket[], fields) => {
        if (err) {
            console.error(err.message);
            res.sendStatus(400);
        } else if (results.length < 1) {
            console.log(results);
            console.log('no user found for email : ', data.email);
            res.sendStatus(400);
        } else {
            console.log('success!');
            res.sendStatus(200);
        }
    });
});

export default accountRouter;