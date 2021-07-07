import { Router } from 'express';
import termsRouter from './terms.routes';
import generalRouter from './general.routes';
import accountRouter from './account.routes';
import adminRouter from './admin.routes';
import newsRouter from './news.routes';
import userRouter from './user.routes';

const routes = Router();
routes.use('/terms', termsRouter);
routes.use('/general', generalRouter);
routes.use('/account', accountRouter);
routes.use('/admin', adminRouter);
routes.use('/news', newsRouter);
routes.use('/user', userRouter);

export default routes;