import {Request, Response, Router} from 'express';
import {RowDataPacket} from "mysql";
import {findCategoryIdx, getCategories, saveNewsCategoriesMap, updateCategories} from "../libraries/news_library";
import {sendNewsFcmPush} from "../libraries/push_library";

const { pool } = require('../helpers/database');

const adminRouter = Router();

adminRouter.get('/add_news', async (req: Request, res: Response) => {
    const categoryData = await getCategories();
    res.render('add_news', {categories: categoryData.categories});
});
adminRouter.post('/add_news', async (req: Request, res: Response) => {
    // 뉴스 데이터 db에 저장
    let data:any = req.body;
    let newsSql = "INSERT INTO `news`(`title`, `from`, `url`, `body`) VALUES (?, ?, ?, ?)";

    try {
        const [insertNewsResult] = await pool.promise().query(newsSql, [data.title, data.from, data.url, data.body]);
        const newsIdx:number = insertNewsResult.insertId;

        const categories = data.categories.split(",");
        const categoryData = await getCategories(true, categories);
        let alreadyPushSent:boolean = false;
        for (const category of categories) {
            const categoryIdx:number = await findCategoryIdx(category.trim());
            // 카테고리가 이미 존재하지 않는 경우 다음 카테고리로 스킵
            if(categoryIdx < 0) {
                continue;
            }

            // 뉴스 - 분야 매핑 정보 저장
            await saveNewsCategoriesMap(categoryIdx, newsIdx);
            // 뉴스 푸시 알림 전송
            const topic:string = categoryData.topics[categoryData.categories.indexOf(category)];
            if(!alreadyPushSent) {
                sendNewsFcmPush(topic, {
                    category: category,
                    news_title: data.title,
                    news_url: data.url,
                });
                alreadyPushSent = true;
            }
        }
        res.redirect('/admin/add_news');
    } catch(err) {
        console.error(err);
        res.sendStatus(400);
    }
});
/**
 * 운영자에게 뉴스 추가 요청
 */
adminRouter.post('/request_add_news', async (req: Request, res: Response) => {
   let data:any = req.body;
   let requestAddNewsSql = "INSERT INTO `news_add_requests`(`url`, `memo`) VALUES (?, ?)";
   try {
       const [insertRequestResult] = await pool.promise().query(requestAddNewsSql, [data.url, data.memo]);
       res.sendStatus(200);
   } catch(err) {
       console.error(err);
       res.sendStatus(400);
   }
});

export default adminRouter;