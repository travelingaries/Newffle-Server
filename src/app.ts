import cookieParser from 'cookie-parser';
import path from 'path';
import express, {NextFunction, Request, RequestHandler, Response} from 'express';
import {Md5} from 'ts-md5/dist/md5';

// logger
import Logger from 'jet-logger';
const logger = new Logger();

// connect with mysql rdb
import mysql, {Pool, PoolConnection} from 'mysql';
import dbconfig from './config/dbconfig.json';
const pool:Pool = mysql.createPool(dbconfig);
import {OkPacket, RowDataPacket} from "mysql";

const app: express.Express = express();
app.use(express.json() as RequestHandler);
app.use(express.urlencoded({extended: true}) as RequestHandler);
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
    res.sendStatus(200);
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
app.post('/user/categories', (req: Request, res: Response) => {
    let data:any = req.body;
    let insert_category_sql = "INSERT INTO user_category_subscriptions(user_idx, category_idx, status, notification_option) VALUES(?, ?, ?, ?)";
    pool.query(insert_category_sql, [data.user_idx, data.category_idx, 1, 1], (err, results:RowDataPacket[], fields) => {
        if (err) {
            console.error(err.message);
            res.sendStatus(400);
        }
        res.sendStatus(200);
    });
});
app.get('/user/find_user_idx/:uid', (req: Request, res: Response) => {
    let uid_sql = "SELECT * FROM users WHERE firebase_uid=?";
    pool.query(uid_sql, [req.params.uid], (err, results: RowDataPacket[], fields) => {
       if (err) {
           console.error(err.message);
           res.sendStatus(400);
       } else if(results.length < 1) {
           res.sendStatus(404);
       } else {
           res.json(results[0].idx);
       }
    });
});
app.get('/news/find_category_idx/:category', (req: Request, res: Response) => {
    let category_sql = "SELECT * FROM news_categories WHERE category=?";
    pool.query(category_sql, [req.params.category], (err, results: RowDataPacket[], fields) => {
        if (err) {
            console.error(err.message);
            res.sendStatus(400);
        } else if(results.length < 1) {
            res.sendStatus(404);
        } else {
            res.json(results[0].idx);
        }
    });
});
app.get('/user/categories/:uid', (req: Request, res: Response) => {
    let uid:String = req.params.uid;
    let category_sql = "SELECT * FROM `user_category_subscriptions` JOIN `users` ON users.idx=user_category_subscriptions.user_idx JOIN `news_categories` ON news_categories.idx=user_category_subscriptions.category_idx WHERE users.firebase_uid=?";
    pool.query(category_sql, [uid], (err, results:RowDataPacket[], fields) => {
        if (err) {
            console.error(err.message);
            res.sendStatus(400);
        }
        let user_categories:String[] = [];
        results.forEach((result) => {
            user_categories.push(result.category);
        });
        res.json(user_categories);
    });
});
app.get('/news/categories', (req: Request, res: Response) => {
    let categories_sql = "SELECT * FROM `news_categories`";
    pool.query(categories_sql, [], (err, results:RowDataPacket[], fields) => {
        if (err) {
            console.error(err.message);
            res.sendStatus(400);
        }
        let categories:String[] = [];
        results.forEach((result) => {
            categories.push(result.category);
        });
        res.json(categories);
    });
});
app.get('/news/news_in_category/:category_idx', (req: Request, res: Response) => {
   let news_in_categories_sql = "SELECT * FROM `news` JOIN `news_categories_map` ON news_categories_map.news_idx = news.idx WHERE news_categories_map.category_idx=?";
   pool.query(news_in_categories_sql, [req.params.category_idx], (err, results:RowDataPacket[], fields) => {
      if(err) {
          console.error(err.message);
          res.sendStatus(400);
      }
      res.json(results);
   });
});
app.post('/news/find_category_idx', (req: Request, res: Response) => {
   let data:any = req.body;
   let find_category_idx_sql = "SELECT * FROM `news_categories` WHERE category=?";
   pool.query(find_category_idx_sql, [data.category], (err, results:RowDataPacket[], fields) => {
      if (err) {
          console.error(err.message);
          res.sendStatus(400);
      } else if (results.length < 1) {
          res.sendStatus(404);
      } else {
          res.json(results[0].idx);
      }
   });
});
app.post('/account/signup', (req: Request, res: Response) => {
    let data:any = req.body;
    console.log(data);
    let create_user_sql = "INSERT INTO `users`(`email`, `password`, `fcm_token`, `signup_from`, `firebase_uid`) VALUES (?, ?, ?, ?, ?)";
    pool.query(create_user_sql, [data.email, Md5.hashStr(data.password), data.fcm_token, data.signup_from, data.firebase_uid], (err, results:OkPacket, fields) => {
        if (err) {
            console.error(err.message);
            res.sendStatus(400);
        }
        console.log(results);
        res.sendStatus(200);
    });
});
app.post('/account/login', (req: Request, res: Response) => {
    let data:any = req.body;
    console.log(data);
    let login_user_sql = "SELECT * FROM `users` WHERE email=? AND password=?";
    pool.query(login_user_sql, [data.email, Md5.hashStr(data.password)], (err, results:RowDataPacket[], fields) => {
        if (err) {
            console.error(err.message);
            res.sendStatus(400);
        } else if (results.length < 1) {
            console.log(results);
            console.log('no user found for email : ', data.email);
            res.sendStatus(400);
        } else {
            console.log('success!');
            res.sendStatus(200);
        }
    });
});

// Start the server
const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
    logger.info('Express server started on port: ' + port);
});