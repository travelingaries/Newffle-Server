import {Request, Response, Router} from 'express';
import {RowDataPacket} from "mysql";
import {findCategoryIdx, getCategories} from "../libraries/news_library";
import {
    findUserIdxFromUid,
    getUserSubscriptionData,
    getUserPushOnOff, setUserCategoryNotificationOption,
    setUserPushOnOff
} from "../libraries/user_library";

const { pool } = require('../helpers/database');

const userRouter = Router();

/**
 * 유저의 관심분야들을 불러오기
 */
userRouter.get('/categories/:uid', async (req: Request, res: Response) => {
    const uid:string = req.params.uid;
    const userIdx:number = await findUserIdxFromUid(uid);

    const categoryData = await getCategories();
    const categories:string[] = categoryData.categories;
    const topics:string[] = categoryData.topics;

    const userCategorySubscriptions = await getUserSubscriptionData(userIdx)
    res.json({
        categories: categories,
        topics: topics,
        userCategories: userCategorySubscriptions.categories
    });
});

/**
 * 관심분야 구독
 */
userRouter.post('/categories/subscribe', async(req: Request, res: Response) => {
    let data:any = req.body;
    const category:string = data.category;
    const userIdx = await findUserIdxFromUid(data.uid);

    const categoryIdx = await findCategoryIdx(category);
    let insertCategorySql = "INSERT INTO user_category_subscriptions(user_idx, category_idx, status, notification_option) VALUES(?, ?, ?, ?)";
    try {
        const [insertResult] = await pool.promise().query(insertCategorySql, [userIdx, categoryIdx, 1, 1]);
    } catch(err) {
        console.error(err.message);
        res.sendStatus(400);
    }
    res.sendStatus(200);
});
/**
 * 관심분야 구독 취소
 */
userRouter.post('/categories/unsubscribe', async(req: Request, res: Response) => {
        let data:any = req.body;
    const category:string = data.category;
    const userIdx = await findUserIdxFromUid(data.uid);

    const categoryIdx = await findCategoryIdx(category);
    let deleteCategorySql = "DELETE FROM `user_category_subscriptions` WHERE `user_idx`=? AND `category_idx`=?";
    try {
        const [deleteResult] = await pool.promise().query(deleteCategorySql, [userIdx, categoryIdx]);
    } catch(err) {
        console.error(err.message);
        res.sendStatus(400);
    }
    res.sendStatus(200);
});

/**
 * 유저의 푸시 알림 설정들을 조회하기
 */
userRouter.post('/categories/notifications', async (req:Request, res:Response) => {
    const data:any = req.body;
    const uid:string = data.uid;
    const userIdx:number = await findUserIdxFromUid(uid);

    const userPushOn = await getUserPushOnOff(userIdx);
    const userCategoryNotificationOptions = await getUserSubscriptionData(userIdx)
    const userNotificationOptions = {
        'pushOn' : userPushOn,
        'categories': userCategoryNotificationOptions.categories,
        'topics': userCategoryNotificationOptions.topics,
        'categoryNotifications' : userCategoryNotificationOptions.categoryNotifications
    }
    res.json(userNotificationOptions);
});
/**
 * 유저의 푸시 알림 전체 설정 업데이트하기
 */
userRouter.post('/categories/notifications/push_on', async(req:Request, res:Response) => {
    const data:any = req.body;
    const uid:string = data.uid;
    const userIdx:number = await findUserIdxFromUid(uid);
    await setUserPushOnOff(userIdx, data.pushOn);
    res.sendStatus(200);
});
/**
 * 유저의 카테고리별 푸시 알림 설정 업데이트하기
 */
userRouter.post('/categories/notifications/category', async(req:Request, res:Response) => {
    const data:any = req.body;
    const uid:string = data.uid;
    const userIdx:number = await findUserIdxFromUid(uid);
    const category:string = data.category;
    const categoryIdx:number = await findCategoryIdx(category);
    const categoryNotification:number = data.categoryNotification;
    await setUserCategoryNotificationOption(userIdx, categoryIdx, categoryNotification)
    res.sendStatus(200);
});

export default userRouter;