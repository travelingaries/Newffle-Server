import {Request, Response, Router} from 'express';

// connect with mysql rdb
import mysql, {Pool, PoolConnection} from 'mysql';
import dbconfig from '../config/dbconfig.json';
const pool:Pool = mysql.createPool(dbconfig);
import {OkPacket, RowDataPacket} from "mysql";

const userRouter = Router();

userRouter.post('/categories', (req: Request, res: Response) => {
    let data:any = req.body;
    let insert_category_sql = "INSERT INTO user_category_subscriptions(user_idx, category_idx, status, notification_option) VALUES(?, ?, ?, ?)";
    pool.query(insert_category_sql, [data.user_idx, data.category_idx, 1, 1], (err, results:RowDataPacket[], fields) => {
        if (err) {
            console.error(err.message);
            res.sendStatus(400);
        }
        res.sendStatus(200);
    });
});
userRouter.get('/find_user_idx/:uid', (req: Request, res: Response) => {
    let uid_sql = "SELECT * FROM users WHERE firebase_uid=?";
    pool.query(uid_sql, [req.params.uid], (err, results: RowDataPacket[], fields) => {
        if (err) {
            console.error(err.message);
            res.sendStatus(400);
        } else if(results.length < 1) {
            res.sendStatus(404);
        } else {
            res.json(results[0].idx);
        }
    });
});
userRouter.get('/categories/:uid', (req: Request, res: Response) => {
    let uid:String = req.params.uid;
    let category_sql = "SELECT * FROM `user_category_subscriptions` JOIN `users` ON users.idx=user_category_subscriptions.user_idx JOIN `news_categories` ON news_categories.idx=user_category_subscriptions.category_idx WHERE users.firebase_uid=?";
    pool.query(category_sql, [uid], (err, results:RowDataPacket[], fields) => {
        if (err) {
            console.error(err.message);
            res.sendStatus(400);
        }
        let user_categories:String[] = [];
        results.forEach((result) => {
            user_categories.push(result.category);
        });
        res.json(user_categories);
    });
});

export default userRouter;