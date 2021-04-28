import './pre-start'; // Must be the first import
import app from '@server';
import logger from '@shared/Logger';

// connect with mysql rdb
import db from './config/db';
import {Request, Response} from "express";
import {cookieProps} from "@shared/constants";
db.connect();

app.get('/', (req: Request, res: Response) => {
    res.redirect('/admin');
});
app.get('/admin', (req: Request, res: Response) => {
    res.render('login');
});
app.get('/admin/add_news', (req: Request, res: Response) => {
    res.render('add_news');
});
app.post('/admin/add_news', (req: Request, res: Response) => {
    res.redirect('/admin');
});

// Start the server
const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
    logger.info('Express server started on port: ' + port);
});
