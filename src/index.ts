import './pre-start'; // Must be the first import
import app from '@server';
import logger from '@shared/Logger';

// connect with mysql rdb
import db from './config/db';
import {Request, Response} from "express";
import {cookieProps} from "@shared/constants";
import {OkPacket, RowDataPacket} from "mysql";
let con = db.connect();

app.get('/', (req: Request, res: Response) => {
    res.redirect('/admin');
});
app.get('/admin', (req: Request, res: Response) => {
    res.render('login');
});
app.get('/admin/add_news', (req: Request, res: Response) => {
    let category_sql:string = "SELECT * FROM `news_categories` ORDER BY `idx` ASC";
    let categories:string[] = [];
    con.query(category_sql, [], (err, results:RowDataPacket[], fields) => {
        if (err) {
            console.error(err.message);
        } else {
            results.forEach((result) => {
                categories.push(result.category);
            });
        }
        res.render('add_news', {categories: categories});
    });
});
app.post('/admin/add_news_data', (req: Request, res: Response) => {
    // 뉴스 데이터 db에 저장
    let data:any = req.body;
    let news_sql = "INSERT INTO `news`(`title`, `from`, `url`, `body`) VALUES (?, ?, ?, ?)";
    con.query(news_sql, [data.title, data.from, data.url, data.body], (err_news_sql, results_news_sql:OkPacket, fields_news_sql) => {
        if(err_news_sql) {
            return console.error(err_news_sql.message);
        }
        let news_idx:number = results_news_sql.insertId;
        let category_idx:number = 0;

        let categories = data.categories.split(",");
        let category_sql:string;
        categories.forEach((category:string) => {
            // 분야가 이미 db에 저장되어 있지 않다면 추가
            category_sql = "SELECT * FROM `news_categories` WHERE `category` = ?";
            con.query(category_sql, [category.trim()], (err_category_sql, results_category_sql:RowDataPacket[], fields_category_sql) => {
                if(err_category_sql) {
                    return console.error(err_category_sql.message);
                }
                if(JSON.parse(JSON.stringify(results_category_sql)).length < 1) {
                    let category_insert_sql:string = "INSERT INTO `news_categories`(`category`) VALUES (?)";
                    con.query(category_insert_sql, [category.trim()], (err_category_insert_sql, results_category_insert_sql:OkPacket, fields_category_insert_sql ) => {
                        if(err_category_insert_sql) {
                            return console.error(err_category_insert_sql);
                        }
                        category_idx = results_category_insert_sql.insertId;

                        // 뉴스와 분야 map db에 저장
                        let map_sql:string = "INSERT INTO `news_categories_map`(`category_idx`, `news_idx`) VALUES (?, ?)";
                        con.query(map_sql, [category_idx, news_idx], (err_map_sql, results_map_sql, fields_map_sql ) => {
                            if(err_map_sql) {
                                return console.error(err_map_sql);
                            }
                            res.redirect('/admin/add_news');
                            return;
                        });
                    });
                } else {
                    category_idx = results_category_sql[0]['idx'];

                    // 뉴스와 분야 map db에 저장
                    let map_sql:string = "INSERT INTO `news_categories_map`(`category_idx`, `news_idx`) VALUES (?, ?)";
                    con.query(map_sql, [category_idx, news_idx], (err_map_sql, results_map_sql, fields_map_sql ) => {
                        if(err_map_sql) {
                            return console.error(err_map_sql);
                        }
                        res.redirect('/admin/add_news');
                        return;
                    });
                }
            });
        });
    });
});

// Start the server
const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
    logger.info('Express server started on port: ' + port);
});
