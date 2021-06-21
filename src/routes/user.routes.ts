import {Request, Response, Router} from 'express';
import {RowDataPacket} from "mysql";
import {findCategoryIdx} from "../libraries/news_library";
import {findUserIdxFromUid, getUserCategoryNotificationOptions, getUserPushOnOff} from "../libraries/user_library";

const { pool } = require('../helpers/database');

const userRouter = Router();

/**
 * 유저의 관심분야들을 불러오기
 */
userRouter.get('/categories/:uid', async (req: Request, res: Response) => {
    let uid:string = req.params.uid;
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
/**
 * 유저의 관심분야들을 새로 업데이트하기
 */
userRouter.post('/categories', async (req: Request, res: Response) => {
    let data:any = req.body;
    let selectedCategories:string[] = data.selectedCategories;
    let initialSelectedCategories:string[] = data.initialSelectedCategories;

    let newlySelected = selectedCategories.filter(category => !initialSelectedCategories.includes(category));
    let unselected = initialSelectedCategories.filter(category => !selectedCategories.includes(category));

    const userIdx = await findUserIdxFromUid(data.uid);
    for(const category of newlySelected) {
        const categoryIdx = await findCategoryIdx(category);
        let insertCategorySql = "INSERT INTO user_category_subscriptions(user_idx, category_idx, status, notification_option) VALUES(?, ?, ?, ?)";
        try {
            const [insertResult] = await pool.promise().query(insertCategorySql, [userIdx, categoryIdx, 1, 1]);
        } catch(err) {
            console.error(err.message);
            res.sendStatus(400);
        }
    }
    for(const category of unselected) {
        const categoryIdx = await findCategoryIdx(category);
        let deleteCategorySql = "DELETE FROM `user_category_subscriptions` WHERE `user_idx`=? AND `category_idx`=?";
        try {
            const [deleteResult] = await pool.promise().query(deleteCategorySql, [userIdx, categoryIdx]);
        } catch(err) {
            console.error(err.message);
            res.sendStatus(400);
        }
    }
    res.sendStatus(200);
});
/**
 * 유저의 푸시 알림 설정들을 조회하기
 */
userRouter.get('/notification_options/:uid', async (req:Request, res:Response) => {
    const uid:string = req.params.uid;
    const userIdx = await findUserIdxFromUid(uid);

    const userPushOn = await getUserPushOnOff(userIdx);
    const userCategoryNotificationOptions = await getUserCategoryNotificationOptions(userIdx)
    const userNotificationOptions = {
        'push_on' : userPushOn,
        'category_notifications' : userCategoryNotificationOptions
    }
    res.json(userNotificationOptions);
});

export default userRouter;