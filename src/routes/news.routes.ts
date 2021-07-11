import {Request, Response, Router} from 'express';
import {findCategoryIdx, getCategories, getNewsInCategory} from "../libraries/news_library";

const { pool } = require('../helpers/database');

const newsRouter = Router();

newsRouter.get('/categories', async (req: Request, res: Response) => {
    const categoryData = await getCategories();
    return categoryData.categories;
});
newsRouter.post('/news_in_category', async (req: Request, res: Response) => {
    let data:any = req.body;
    const categoryIdx:number = await findCategoryIdx(data.category);

    let limit:number = 20;
    if(data.limit != null) {
        limit = data.limit;
    }
    res.json(await getNewsInCategory(categoryIdx, limit));
});

export default newsRouter;