import {Request, Response, Router} from 'express';
import {RowDataPacket} from "mysql";
const { pool } = require('../helpers/database');

const generalRouter = Router();

generalRouter.get('/meta/:screen', async(req:Request, res:Response) => {
    const screen:string = req.params.screen;
    // 메인화면 메타
    if(screen == 'main') {
        // 현재 영업시간인지 확인
        const date:Date = new Date((new Date()).toLocaleDateString("ko-KR", {timeZone: "Asia/Seoul"}));
        let worktime:boolean = true;
        if(date.getDay() % 6 === 0) {
            worktime = false;
        } else {
            const month:number = date.getMonth();
            const day:number = date.getDate();
            const holidays:number[][] = [[8,16], [9,20], [9,21], [9,22], [10,4], [10,11], [12,27]];
            for(const holiday in holidays) {
                if((month+1) === parseInt(holiday[0]) && day === parseInt(holiday[1])) {
                    worktime = false;
                }
            }
        }
        if(worktime) {
            const hour:number = parseInt(((new Date()).toLocaleTimeString("ko-KR", {timeZone: "Asia/Seoul", hour: 'numeric', minute: 'numeric'})).substr(3).split(':')[0]);
            if(hour < 8 || hour === 12 || hour >= 16) {
                worktime = false;
            }
        }

        // 메뉴 항목들 불러오기
        let drawerMenuItemsSql = "SELECT * FROM `drawer_menu_items` WHERE `status`=1";
        let menuNames:string[] = [];
        let menuRoutes:string[] = [];
        try {
            const [queryResults] = await pool.promise().query(drawerMenuItemsSql);
            queryResults.forEach((result:RowDataPacket) => {
                if(result.menu != null && result.category != '') {
                    menuNames.push(result.menu);
                }
                if(result.route != null && result.route != '') {
                    menuRoutes.push(result.route);
                }
            });
            res.json({
                'worktime': worktime,
                'menuNames': menuNames,
                'menuRoutes': menuRoutes,
            });
        } catch(err) {
            console.error(err.message);
            res.sendStatus(400);
        }
    } else {
        res.sendStatus(401);
    }
});

export default generalRouter;