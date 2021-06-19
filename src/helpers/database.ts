import mysql2 from 'mysql2';
import dbconfig from '../config/dbconfig.json';

export const pool = mysql2.createPool(dbconfig);