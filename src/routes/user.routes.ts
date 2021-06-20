import {Request, Response, Router} from 'express';
import {RowDataPacket} from "mysql";
import {findCategoryIdx} from "../libraries/news_library";

const { pool } = require('../helpers/database');

const userRouter = Router();

userRouter.post('/categories', async (req: Request, res: Response) => {
    let data:any = req.body;
    let selectedCategories:string[] = data.selectedCategories;
    let initialSelectedCategories:string[] = data.initialSelectedCategories;

    let newlySelected = selectedCategories.filter(category => !initialSelectedCategories.includes(category));
    let unselected = initialSelectedCategories.filter(category => !selectedCategories.includes(category));

    for(const category of newlySelected) {
        const categoryIdx = await findCategoryIdx(category);
        let insertCategorySql = "INSERT INTO user_category_subscriptions(user_idx, category_idx, status, notification_option) VALUES(?, ?, ?, ?)";
        try {
            const [insertResult] = await pool.promise().query(insertCategorySql, [data.userIdx, categoryIdx, 1, 1]);
        } catch(err) {
            console.error(err.message);
            res.sendStatus(400);
        }
    }
    for(const category of unselected) {
        const categoryIdx = await findCategoryIdx(category);
        let deleteCategorySql = "DELETE FROM `user_category_subscriptions` WHERE `user_idx`=? AND `category_idx`=?";
        try {
            const [deleteResult] = await pool.promise().query(deleteCategorySql, [data.userIdx, categoryIdx]);
        } catch(err) {
            console.error(err.message);
            res.sendStatus(400);
        }
    }
    res.sendStatus(200);
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