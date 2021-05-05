import cookieParser from 'cookie-parser';
import path from 'path';
import express, {NextFunction, Request, Response } from 'express';
import {Md5} from 'ts-md5/dist/md5';

// logger
import Logger from 'jet-logger';
const logger = new Logger();

// connect with mysql rdb
import mysql, {Pool, PoolConnection} from 'mysql';
import dbconfig from './config/dbconfig.json';
const pool:Pool = mysql.createPool(dbconfig);
import {OkPacket, RowDataPacket} from "mysql";
import ErrnoException = NodeJS.ErrnoException;

const app = express();
app.use(express.json());
app.use(express.urlencoded({extended: true}));
// Cookie Properties
export const cookieProps = Object.freeze({
    key: 'ExpressGeneratorTs',
    secret: process.env.COOKIE_SECRET,
    options: {
        httpOnly: true,
        signed: true,
        path: (process.env.COOKIE_PATH),
        maxAge: Number(process.env.COOKIE_EXP),
        domain: (process.env.COOKIE_DOMAIN),
        secure: (process.env.SECURE_COOKIE === 'true'),
    },
});
app.use(cookieParser(cookieProps.secret));

// view engine
const viewsDir = path.join(__dirname, 'views');
app.set('views', viewsDir);
app.set('view engine', 'ejs');
const staticDir = path.join(__dirname, 'public');
app.use(express.static(staticDir));

// routes
app.get('/', (req: Request, res: Response) => {
    res.redirect('/admin/add_news');
});
app.get('/admin', (req: Request, res: Response) => {
    res.render('login');
});
app.get('/admin/add_news', (req: Request, res: Response) => {
    let category_sql:string = "SELECT * FROM `news_categories` ORDER BY `idx` ASC";
    let categories:string[] = [];
    pool.query(category_sql, [], (err, results:RowDataPacket[], fields) => {
        if (err) {
            console.error(err.message);
        }
        results.forEach((result) => {
            categories.push(result.category);
        });
        res.render('add_news', {categories: categories});
    });
});
app.post('/admin/add_news', (req: Request, res: Response) => {
    // 뉴스 데이터 db에 저장
    let data:any = req.body;
    let news_sql = "INSERT INTO `news`(`title`, `from`, `url`, `body`) VALUES (?, ?, ?, ?)";
    pool.query(news_sql, [data.title, data.from, data.url, data.body], (err_news_sql, results_news_sql:OkPacket, fields_news_sql) => {
        if(err_news_sql) {
            console.error(err_news_sql.message);
            res.sendStatus(400);
        }
        let news_idx:number = results_news_sql.insertId;
        let category_idx:number = 0;

        let categories = data.categories.split(",");
        let category_sql:string;
        categories.forEach((category:string, index:number) => {
            // 분야가 이미 db에 저장되어 있지 않다면 추가
            category_sql = "SELECT * FROM `news_categories` WHERE `category` = ?";
            pool.query(category_sql, [category.trim()], (err_category_sql, results_category_sql:RowDataPacket[], fields_category_sql) => {
                if(err_category_sql) {
                    console.error(err_category_sql.message);
                    res.sendStatus(400);
                }
                if(JSON.parse(JSON.stringify(results_category_sql)).length < 1) {
                    let category_insert_sql:string = "INSERT INTO `news_categories`(`category`) VALUES (?)";
                    pool.query(category_insert_sql, [category.trim()], (err_category_insert_sql, results_category_insert_sql:OkPacket, fields_category_insert_sql ) => {
                        if(err_category_insert_sql) {
                            console.error(err_category_insert_sql.message);
                            res.sendStatus(400);
                        }
                        category_idx = results_category_insert_sql.insertId;

                        // 뉴스와 분야 map db에 저장
                        let map_sql:string = "INSERT INTO `news_categories_map`(`category_idx`, `news_idx`) VALUES (?, ?)";
                        pool.query(map_sql, [category_idx, news_idx], (err_map_sql, results_map_sql, fields_map_sql ) => {
                            if(err_map_sql) {
                                console.error(err_map_sql.message);
                                return console.error(err_map_sql);
                            }
                            if(index == categories.length - 1) {
                                res.redirect('/admin/add_news');
                            }
                        });
                    });
                } else {
                    category_idx = results_category_sql[0]['idx'];

                    // 뉴스와 분야 map db에 저장
                    let map_sql:string = "INSERT INTO `news_categories_map`(`category_idx`, `news_idx`) VALUES (?, ?)";
                    pool.query(map_sql, [category_idx, news_idx], (err_map_sql, results_map_sql, fields_map_sql ) => {
                        if(err_map_sql) {
                            console.error(err_map_sql.message);
                            return console.error(err_map_sql);
                        }
                        if(index == categories.length - 1) {
                            res.redirect('/admin/add_news');
                        }
                    });
                }
            });
        });
    });
});
app.post('/account/signup', (req: Request, res: Response) => {
    let data:any = req.body;
    let create_user_sql = "INSERT INTO `users`(`email`, `password`, `fcm_token`, `signup_from`) VALUES (?, ?, ?, ?)";
    pool.query(create_user_sql, [data.email, Md5.hashStr(data.password), data.fcm_token, data.signup_from], (err, results:OkPacket, fields) => {
        if (err) {
            console.error(err.message);
            res.sendStatus(400);
        }
        res.sendStatus(200);
    });
});
app.post('/account/login', (req: Request, res: Response) => {
    let data:any = req.body;
    let login_user_sql = "SELECT * FROM `users` WHERE email=? AND password=?";
    pool.query(login_user_sql, [data.email, Md5.hashStr(data.password)], (err, results:RowDataPacket[], fields) => {
        if (err) {
            console.error(err.message);
            res.sendStatus(400);
        } else if (results.length < 1) {
            console.log('no user found for email : ', data.email);
            res.sendStatus(400);
        } else {
            res.sendStatus(200);
        }
    });
});

// Start the server
const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
    logger.info('Express server started on port: ' + port);
});