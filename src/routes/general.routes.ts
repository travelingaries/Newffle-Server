import {Request, Response, Router} from 'express';
import {RowDataPacket} from "mysql";
import userRouter from "./user.routes";
const { pool } = require('../helpers/database');

const generalRouter = Router();

/**
 * 메뉴 항목들 불러오기
 */
generalRouter.get('/menu', async(req: Request, res: Response) => {
    let drawerMenuItemsSql = "SELECT * FROM `drawer_menu_items` WHERE `status`=1";
    try {
        const [queryResults] = await pool.promise().query(drawerMenuItemsSql);
        let menuNames:string[] = [];
        let menuRoutes:string[] = [];
        queryResults.forEach((result:RowDataPacket) => {
            if(result.menu != null && result.category != '') {
                menuNames.push(result.menu);
            }
            if(result.route != null && result.route != '') {
                menuRoutes.push(result.route);
            }
        })
        res.json({
            'menuNames': menuNames,
            'menuRoutes': menuRoutes,
        });
    } catch(err) {
        console.error(err.message);
        res.sendStatus(400);
    }
});

export default generalRouter;