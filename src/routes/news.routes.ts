import {Request, Response, Router} from 'express';
import {RowDataPacket} from "mysql";
import {findCategoryIdx} from "../libraries/news_library";

const { pool } = require('../helpers/database');

const newsRouter = Router();

newsRouter.get('/categories', async (req: Request, res: Response) => {
    let categoriesSql = "SELECT * FROM `news_categories`";
    try {
        const [queryResults] = await pool.promise().query(categoriesSql);
        let categories:string[] = [];
        queryResults.forEach((result:RowDataPacket) => {
            if(result.category != '') {
                categories.push(result.category);
            }
        })
        res.json(categories);
    } catch(err) {
        console.error(err.message);
        res.sendStatus(400);
    }
});
newsRouter.post('/news_in_category', async (req: Request, res: Response) => {
    let data:any = req.body;
    const categoryIdx:number = await findCategoryIdx(data.category);

    let limit:number = 20;
    if(data.limit != null) {
        limit = data.limit;
    }
    let newsInCategoriesSql = "SELECT *, TIMESTAMPDIFF(MINUTE, news.created_time, CURRENT_TIMESTAMP) as diff_minutes FROM `news` JOIN `news_categories_map` ON news_categories_map.news_idx = news.idx WHERE news_categories_map.category_idx=? ORDER BY news.idx DESC LIMIT ?";
    try {
        const [queryResults] = await pool.promise().query(newsInCategoriesSql, [categoryIdx, limit]);
        for(let i:number = 0; i < queryResults.length; i++) {
            let diffMinutes:number = queryResults[i].diff_minutes;
            let diffHours:number = 0;
            let diffDays:number = 0;
            if(diffMinutes >= 60) {
                diffHours = Math.floor(diffMinutes / 60);
                diffMinutes %= 60;
                queryResults[i].diffHours = diffHours;
                queryResults[i].diffMinutes = diffMinutes;
            }
            if(diffHours >= 24) {
                diffDays = Math.floor(diffHours / 24);
                diffHours %= 24;
                queryResults[i].diffDays = diffDays;
                queryResults[i].diffHours = diffHours;
            }
        }
        res.json(queryResults);
    } catch(err) {
        console.error(err);
        res.sendStatus(400);
    }
});

export default newsRouter;