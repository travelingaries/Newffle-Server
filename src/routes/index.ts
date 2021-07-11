import { Router } from 'express';
import termsRouter from './terms.routes';
import generalRouter from './general.routes';
import adminRouter from './admin.routes';
import accountRouter from './account.routes';
import boardRouter from './board.routes';
import newsRouter from './news.routes';
import userRouter from './user.routes';

const routes = Router();
routes.use('/terms', termsRouter);
routes.use('/general', generalRouter);
routes.use('/admin', adminRouter);
routes.use('/account', accountRouter);
routes.use('/board', boardRouter);
routes.use('/news', newsRouter);
routes.use('/user', userRouter);

export default routes;