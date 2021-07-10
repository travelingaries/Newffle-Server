import cookieParser from 'cookie-parser';
import path from 'path';
import express, {NextFunction, Request, RequestHandler, Response} from 'express';

// logger
import Logger from 'jet-logger';
const logger = new Logger();

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
import routes from './routes';
app.use(routes);
app.get('/', (req: Request, res: Response) => {
    res.render('index');
});

// Start the server
const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
    logger.info('Express server started on port: ' + port);
});