import {Request, Response, Router} from 'express';
import {RowDataPacket} from "mysql";

const { pool } = require('../helpers/database');

const newsRouter = Router();

newsRouter.get('/categories', async (req: Request, res: Response) => {
    let categoriesSql = "SELECT * FROM `news_categories`";
    try {
        const [queryResults] = await pool.promise().query(categoriesSql);
        let categories:String[] = [];
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
newsRouter.get('/news_in_category/:category_idx', async (req: Request, res: Response) => {
    const categoryIdx = req.params.category_idx;
    let newsInCategoriesSql = "SELECT * FROM `news` JOIN `news_categories_map` ON news_categories_map.news_idx = news.idx WHERE news_categories_map.category_idx=? ORDER BY news.idx DESC LIMIT 20";
    try {
        const [queryResults] = await pool.promise().query(newsInCategoriesSql, [categoryIdx]);
        res.json(queryResults);
    } catch(err) {
        console.error(err);
        res.sendStatus(400);
    }
});
newsRouter.get('/find_category_idx/:category', async (req: Request, res: Response) => {
    let categorySql = "SELECT * FROM news_categories WHERE category=?";
    try {
        const [queryResults] = await pool.promise().query(categorySql, [req.params.category]);
        if(!queryResults[0]) {
            console.error('no category found');
            res.sendStatus(404);
        }
        res.json(queryResults[0].idx);
    } catch(err) {
        console.error(err.message);
        res.sendStatus(400);
    }
});

export default newsRouter;