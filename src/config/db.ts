import mysql from 'mysql';
import dbconfig from './dbconfig.json';

export function connect(): mysql.Connection {
    const con:mysql.Connection = mysql.createConnection(dbconfig);
    con.connect();
    return con;
}

export function close(con: mysql.Connection) {
    con.end();
}

export function insert(query: string, params: any[], con?: mysql.Connection) : Promise<void> {
    return new Promise((resolve, reject) => {
        const gCon: boolean = Boolean(con);
        if(!gCon) {
            con = connect();
        }
        con!.query(query, params, (err: mysql.QueryError|null) => {
            if(err) {
                reject(err);
            }
            resolve();
        });
        if(!gCon) {
            close(con!);
        }
    });
}

export default {
    connect,
    close,
    insert
}
