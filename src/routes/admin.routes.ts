import {Request, Response, Router} from 'express';

const { pool } = require('../helpers/database');

const adminRouter = Router();

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