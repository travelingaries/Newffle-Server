const { pool } = require('../helpers/database');

export async function getLatestPartnerInsights(limit:number = -1) {
    let searchInsightDataSql = "SELECT `partner`, `logo_image_url`, `title`, `url` FROM `insights` JOIN `partners` ON `insights`.`partner_idx`=`partners`.`idx` WHERE `partners`.`status`=1 AND `insights`.`status`=1 ORDER BY `insights`.`idx` DESC";
    if(limit > 0) {
        searchInsightDataSql += " LIMIT " + limit;
    }
    try {
        const [queryResults] = await pool.promise().query(searchInsightDataSql, []);
        return queryResults;
    } catch(err) {
        console.error(err.message);
        throw err;
    }
}