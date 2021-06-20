import {Request, Response, Router} from 'express';
import {RowDataPacket} from "mysql";

const { pool } = require('../helpers/database');

const adminRouter = Router();

// 분야가 이미 db에 저장되어 있지 않다면 추가
async function updateCategories(category:string) {
    let categorySql = "SELECT * FROM `news_categories` WHERE `category` = ?";

    try {
        const [queryResults] = await pool.promise().query(categorySql, [category]);
        if(!queryResults[0]) {
            let insertCategorySql:string = "INSERT INTO `news_categoryes`(`category`) VALUES (?)";
            try {
                const [insertResult] = await pool.promise().query(insertCategorySql, [category]);
                return insertResult.insertId;
            } catch(err) {
                console.error(err.message);
                throw err;
            }
        } else {
            return queryResults[0].idx;
        }
    } catch(err) {
        console.error(err.message);
        throw err;
    }
}
// 뉴스와 분야 map db에 저장
async function saveNewsCategoriesMap(categoryIdx:number, newsIdx:number) {
    let mapSql:string = "INSERT INTO `news_categories_map`(`category_idx`, `news_idx`) VALUES (?, ?)";

    try {
        const [insertResult] = await pool.promise().query(mapSql);
    } catch(err) {
        console.error(err);
        throw err;
    }
}

adminRouter.get('/add_news', async (req: Request, res: Response) => {
    let categorySql:string = "SELECT * FROM `news_categories` ORDER BY `idx` ASC";
    let categories:string[] = [];

    try {
        const [queryResults] = await pool.promise().query(categorySql);
        queryResults.forEach((result:RowDataPacket) => {
            categories.push(result.category);
        });
        res.render('add_news', {categories: categories});
    } catch(err) {
        console.error(err.message);
        res.sendStatus(400);
    }
});
adminRouter.post('/add_news', async (req: Request, res: Response) => {
    // 뉴스 데이터 db에 저장
    let data:any = req.body;
    let newsSql = "INSERT INTO `news`(`title`, `from`, `url`, `body`) VALUES (?, ?, ?, ?)";

    try {
        const [insertNewsResult] = await pool.promise().query(newsSql, [data.title, data.from, data.url, data.body]);
        const newsIdx:number = insertNewsResult.insertId;

        const categories = data.categories.split(",");
        for (const category of categories) {
            const categoryIdx:number = await updateCategories(category.trim());
            await saveNewsCategoriesMap(categoryIdx, newsIdx);
        }
        res.redirect('/admin/add_news');
    } catch(err) {
        console.error(err);
        res.sendStatus(400);
    }
});

export default adminRouter;