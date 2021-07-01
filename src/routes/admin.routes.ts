import {Request, Response, Router} from 'express';
import {RowDataPacket} from "mysql";
import {getCategories, saveNewsCategoriesMap, updateCategories} from "../libraries/news_library";

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