import {Request, Response, Router} from 'express';
import {RowDataPacket} from "mysql";

const { pool } = require('../helpers/database');

const userRouter = Router();

userRouter.post('/categories', async (req: Request, res: Response) => {
    let data:any = req.body;
    let insertCategorySql = "INSERT INTO user_category_subscriptions(user_idx, category_idx, status, notification_option) VALUES(?, ?, ?, ?)";

    try {
        const [insertResult] = await pool.promise().query(insertCategorySql, [data.user_idx, data.category_idx, 1, 1]);
        res.sendStatus(200);
    } catch(err) {
        console.error(err.message);
        res.sendStatus(400);
    }
});
userRouter.get('/find_user_idx/:uid', async (req: Request, res: Response) => {
    let uidSql = "SELECT * FROM users WHERE firebase_uid=?";

    try {
        const [queryResult] = await pool.promise().query(uidSql, [req.params.uid]);
        if(!queryResult[0]) {
            console.error('no user found');
            res.sendStatus(404);
        } else {
            res.json(queryResult[0].idx);
        }
    } catch(err) {
        console.error(err);
        res.sendStatus(400);
    }
});
userRouter.get('/categories/:uid', async (req: Request, res: Response) => {
    let uid:String = req.params.uid;
    let categorySql = "SELECT * FROM `user_category_subscriptions` JOIN `users` ON users.idx=user_category_subscriptions.user_idx JOIN `news_categories` ON news_categories.idx=user_category_subscriptions.category_idx WHERE users.firebase_uid=?";

    try {
        const [queryResults] = await pool.promise().query(categorySql, [uid]);
        let userCategories: String[] = [];
        queryResults.forEach((result:RowDataPacket) => {
            userCategories.push(result.category);
        });
        res.json(userCategories);
    } catch(err) {
        console.error(err.message);
        res.sendStatus(400);
    }
});

export default userRouter;