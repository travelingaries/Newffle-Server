import cookieParser from 'cookie-parser';
import path from 'path';
import express, {NextFunction, Request, RequestHandler, Response} from 'express';

// logger
import Logger from 'jet-logger';
const logger = new Logger();

// firebase
var FCM = require('fcm-node');
const SERVER_KEY = 'AAAAG7TqHXM:APA91bEyD_KJRVuPdaaT5UBjWf9rn28PZkdpzuOUAQtw6w1KPTFbp59DTCMxqMMdKEnYw_rtxTlRI5MKeMEIOC45HQbYjP65hY7Hzb4txUeD9qms35cvhuGGnIoi0IqpaySU9DC0xyxo';

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
    res.sendStatus(200);
});
app.post('/fcm', async(req: Request, res: Response, next: NextFunction) => {
    let data:any = req.body;
    try {
        let fcm = new FCM(SERVER_KEY);
        let message = {
            to: '/topic/' + data.topic,
            notification: {
                title: data.title,
                body: data.body,
                sound: 'default',
                //"click_action": "FCM_PLUGIN_ACTIVITY",
                //"icon": "fcm_push_icon"

            }
        }
        res.json(message);
        /*fcm.send(message, (err: any, response: any) => {
           if(err) {
               next(err);
           } else {
               res.json(response);
           }
        });*/
    } catch (error) {
        next(error);
    }
});

// Start the server
const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
    logger.info('Express server started on port: ' + port);
});