import {Request, Response, Router} from "express";

const termsRouter = Router();

termsRouter.get('/service', async (req: Request, res: Response) => {
    res.render('terms_of_service');
});

export default termsRouter;