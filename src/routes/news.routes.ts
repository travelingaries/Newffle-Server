import {Request, Response, Router} from 'express';

// connect with mysql rdb
import mysql, {Pool, PoolConnection} from 'mysql';
import dbconfig from '../config/dbconfig.json';
const pool:Pool = mysql.createPool(dbconfig);
import {OkPacket, RowDataPacket} from "mysql";

const newsRouter = Router();

newsRouter.get('/find_category_idx/:category', (req: Request, res: Response) => {
    let category_sql = "SELECT * FROM news_categories WHERE category=?";
    pool.query(category_sql, [req.params.category], (err, results: RowDataPacket[], fields) => {
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
newsRouter.get('/categories', (req: Request, res: Response) => {
    let categories_sql = "SELECT * FROM `news_categories`";
    pool.query(categories_sql, [], (err, results:RowDataPacket[], fields) => {
        if (err) {
            console.error(err.message);
            res.sendStatus(400);
        }
        let categories:String[] = [];
        results.forEach((result) => {
            categories.push(result.category);
        });
        res.json(categories);
    });
});
newsRouter.get('/news_in_category/:category_idx', (req: Request, res: Response) => {
    let news_in_categories_sql = "SELECT * FROM `news` JOIN `news_categories_map` ON news_categories_map.news_idx = news.idx WHERE news_categories_map.category_idx=?";
    pool.query(news_in_categories_sql, [req.params.category_idx], (err, results:RowDataPacket[], fields) => {
        if(err) {
            console.error(err.message);
            res.sendStatus(400);
        }
        res.json(results);
    });
});
newsRouter.post('/find_category_idx', (req: Request, res: Response) => {
    let data:any = req.body;
    let find_category_idx_sql = "SELECT * FROM `news_categories` WHERE category=?";
    pool.query(find_category_idx_sql, [data.category], (err, results:RowDataPacket[], fields) => {
        if (err) {
            console.error(err.message);
            res.sendStatus(400);
        } else if (results.length < 1) {
            res.sendStatus(404);
        } else {
            res.json(results[0].idx);
        }
    });
});

export default newsRouter;