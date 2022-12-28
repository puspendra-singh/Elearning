/** Node express */
const express	= 	require('express');
const app 		=	express();
const path 		= require('path');
const https      = require("https");
/**  Configure i18n options, this module is used for multi language site */
const i18n 	= require("i18n");
i18n.configure({
    locales:['en','ar'],
    defaultLocale: 'en',
    directory: __dirname + '/locales',
    directoryPermissions: '755',
    autoReload: true,
    updateFiles: false
});
app.use(i18n.init);

/** required for Helmet (Secure Web) */
const helmet = require('helmet');
app.use(helmet());


/** required for Compression */
const compression = require('compression')

/* compress all responses */
app.use(compression({
	level : 9,
	memLevel : 9
}));

/**  Set Breadcrumbs home information */
const breadcrumbs = require('express-breadcrumbs');
app.use(breadcrumbs.init());
app.use(breadcrumbs.setHome());

/** Mount the breadcrumbs at `/` */
app.use('/', breadcrumbs.setHome({
    name: 'Home',
    url: '/admin/dashboard'
}));

/** Form Input validation */
const expressValidator = require('express-validator');
app.use(expressValidator());

/** bodyParser for node js */
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 }))
app.use(bodyParser.json({ limit: "50mb" }));

/**  read cookies (needed for auth) */
const cookieParser = require('cookie-parser');
app.use(cookieParser());

/** Initialize Ejs Layout  */
const ejsLayouts = require("express-ejs-layouts");
app.use(ejsLayouts);
app.set('view engine', 'html');
app.engine('html', require('ejs').renderFile);


/** Set publically accessable folder */
app.use("/public", express.static(path.join(__dirname, 'public')));

/** Use to upload files */
const	fileUpload = require('express-fileupload');
app.use(fileUpload());

/**  This module is used for flash messages in the system */
const flash  = require('express-flash');
app.use(flash());

/**  including .env file */
require('dotenv').config();

/**  including render file */
const renderHtml = require('./vendor/render');
app.use(renderHtml);


/** Connect to server */
const fs    = require("fs");
const privateKey  = fs.readFileSync( "/var/www/elearning.devtechnosys.tech/ssl/privkey.pem", "utf8");
const certificate = fs.readFileSync( "/var/www/elearning.devtechnosys.tech/ssl/cert.pem", "utf8");
const chain       = fs.readFileSync( "/var/www/elearning.devtechnosys.tech/ssl/fullchain.pem", "utf8");

const credentials = {
  key   : privateKey,
  cert  : certificate,
  ca    : chain,
};

PORT = process.env.PORT || 5000;
MAX_EXECUTION_TIME = process.env.MAX_EXECUTION_TIME || 3000;
const server = https.createServer(credentials, app);
server.timeout = parseInt(30000000);
server.listen(process.env.PORT,function(){
  console.log("Server running at port : " + process.env.PORT);
})

// const server = app.listen(process.env.PORT,'192.168.1.249',()=>{
// 	server.timeout = parseInt(process.env.MAX_EXECUTION_TIME);
//     console.log('Server listening on port ' + process.env.PORT);
// });

/** Function to get unhandled errors and prevent to stop nodejs server **/
process.on("uncaughtException", function (err) {
	console.log("error name ---------"+err.name);    // Print the error name
	console.log("error date ---------"+new Date());    // Print the error name
	console.log("error message ---------"+err.message); // Print the error message
	console.log("error stack ---------"+err.stack);   // Print the stack trace
	setTimeout(function(){
		process.exit(1);
	},1000);
});

/** Including mongo connection file */
const mongo	= require("./config/connection");
mongo.connectToServer(err=>{

    /** Including mongo connection file **/
	let db              = 	mongo.getDb();

	/** required for Session */
	const expressSession  	 = require('express-session');
	const MongoStore      	 = require('./vendor/connect-mongo')(expressSession);
	var sessionTimeInSeconds = 15 * 24 * 60 * 60;
	app.use(expressSession({
		name: 'session',
		resave: false,
		saveUninitialized: false,
		proxy:false,
		secret: 'NodeJs9799530SecretKey515',
		store: new MongoStore({
			db: db,
			//When the session cookie has an expiration date, connect-mongo will use it. Otherwise, it will create a new one, using ttl option.
			ttl: sessionTimeInSeconds, // 15 days,
			autoRemove: 'interval',
			autoRemoveInterval: 60*24, // In a day
		}),
		cookie : {
			maxAge: sessionTimeInSeconds*1000,
		},
    }));

    const routesAdmin = require('./routes/admin');
    routesAdmin.configure(app,mongo);

	const routesFront = require('./routes/front');
    routesFront.configure(app,mongo);
});
