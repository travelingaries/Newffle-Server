import {Request, Response, Router} from 'express';
import {getLatestPartnerInsights} from "../libraries/partner_library";
import {getPopularNewsWithInteractions} from "../libraries/news_library";
import {findUserIdxFromUid, getUserCurrentPlan} from "../libraries/user_library";

const boardRouter = Router();

boardRouter.post('/meta', async (req: Request, res: Response) => {
    const data:any = req.body;
    const uid:string = data.uid;
    const userIdx:number = await findUserIdxFromUid(uid);

    const userPlan = await getUserCurrentPlan(userIdx);
    const popularNews = await getPopularNewsWithInteractions(userIdx);
    const insights = await getLatestPartnerInsights();

    res.json({
        'userPlan': userPlan,
        'popularNews': popularNews,
        'insights': insights,
    });
});

export default boardRouter;