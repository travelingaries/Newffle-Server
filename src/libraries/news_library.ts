import {RowDataPacket} from "mysql";

const { pool } = require('../helpers/database');

export async function findCategoryIdx(category: String): Promise<number> {
    let categorySql = "SELECT * FROM news_categories WHERE category=?";
    try {
        const [queryResults] = await pool.promise().query(categorySql, [category]);
        if (!queryResults[0]) {
            console.error('no category found');
            return -1;
        }
        return queryResults[0].idx;
    } catch (err) {
        console.error(err.message);
        return -1;
    }
}

// 분야가 이미 db에 저장되어 있지 않다면 추가
export async function updateCategories(category:string) {
    let categorySql = "SELECT * FROM `news_categories` WHERE `category` = ?";

    try {
        const [queryResults] = await pool.promise().query(categorySql, [category]);
        if(!queryResults[0]) {
            let insertCategorySql:string = "INSERT INTO `news_categoryes`(`category`) VALUES (?)";
            try {
                const [insertResult] = await pool.promise().query(insertCategorySql, [category]);
                return insertResult.insertId;
            } catch(err) {
                console.error(err.message);
                throw err;
            }
        } else {
            return queryResults[0].idx;
        }
    } catch(err) {
        console.error(err.message);
        throw err;
    }
}

// 카테고리들 불러오기
export async function getCategories(onlyVisible:boolean = true, categories:string[] = []) {
    let categoriesSql:string = "SELECT * FROM `news_categories` WHERE 1=1";
    if(onlyVisible) {
        categoriesSql += " AND `status`=1";
    }
    if(categories.length > 0) {
        categoriesSql += " AND category IN (";
        for(const category of categories) {
            console.log('category in loop:', category);
            categoriesSql += "'" + category + "'";
            if(categories.indexOf(category) < categories.length - 1) {
                categoriesSql += ", ";
            }
        }
        categoriesSql += ")";
    }
    try {
        const [queryResults] = await pool.promise().query(categoriesSql);
        let categories:string[] = [];
        let topics:string[] = [];
        queryResults.forEach((result:RowDataPacket) => {
            if(result.category && result.category != '') {
                categories.push(result.category);
            }
            if(result.fcm_topic && result.fcm_topic != '') {
                topics.push(result.fcm_topic);
            }
        })
        return {
          'categories': categories,
          'topics': topics
        };
    } catch(err) {
        console.error(err.message);
        throw err;
    }
}

// 뉴스와 분야 map db에 저장
export async function saveNewsCategoriesMap(categoryIdx:number, newsIdx:number) {
    let mapSql:string = "INSERT INTO `news_categories_map`(`category_idx`, `news_idx`) VALUES (?, ?)";
    try {
        const [insertResult] = await pool.promise().query(mapSql, [categoryIdx, newsIdx]);
    } catch(err) {
        console.error(err);
        throw err;
    }
}

export default {
    findCategoryIdx,
    updateCategories,
    getCategories,
    saveNewsCategoriesMap
}