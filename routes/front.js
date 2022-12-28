
/**
 * Web.js
 *
 * This file is required by index.js. It sets up event listeners
 *
 * NODE.Js (http://nodejs.org)
 * Copyright Linux Foundation Collaborative (http://collabprojects.linuxfoundation.org/)
 *
 * @copyright     Linux Foundation Collaborative (http://collabprojects.linuxfoundation.org/)
 * @link          http://nodejs.org NODE.JS
 * @package       routes.js
 * @since         NODE.JS Latest version
 * @license       http://collabprojects.linuxfoundation.org Linux Foundation Collaborative
 */

/** Including contants file */
require("./../config/global_constant");

/** include breadcrumb file **/
require(WEBSITE_ROOT_PATH + "breadcrumbs");

/** node cache module */
const NodeCache = require("node-cache");
	myCache 	= new NodeCache();

/* Include all packages used in this file */
const base64		= require('base-64');
const {readFile}	= require("fs");
const utf8			= require('utf8');

/** Including i18n for languages */
const i18n 			= require("i18n");
const { ObjectId } = require("mongodb");

/** Including common function */
require(WEBSITE_ROOT_PATH + "custom_helper");


/**
 * Export a function, so that we can pass the app and io instances from app.js
 *
 * @param router As Express Object
 * @param io As Socket Io Object
 * @param mongo As Mongo db Object
 *
 * @return void.
 */
module.exports = {
	configure: function(router,mongo) {
		db			= mongo.getDb();
		routes      = router;

		/*******************Initialize csrf module***********************/
		const csrf = require('csurf');
		csrfProtection = csrf({ cookie: true });
		/*******************Initialize csrf module end ***********************/

		/** Set default layout for forntend **/
		router.use("/*",function(req, res, next) {

			if(!req.rendering) req.rendering = {};
				
			/** Set default layout for forntend **/
			req.rendering.layout = WEBSITE_LAYOUT_PATH+"default";

			/** Set current view folder **/
			req.rendering.views		=	WEBSITE_MODULES_PATH+"home/views/";
			/** Read/write Basic settings from/in Cache **/
			let settings    = myCache.get( "settings" );
			if ( settings == undefined ){
				readFile(WEBSITE_ROOT_PATH+"config/settings.json", "utf8", function readFileCallback(err, data){
					if(err){
						next();
					}else{
						settings    		=    JSON.parse(data);
						myCache.set( "settings", settings, 0 );
						res.locals.settings =   settings;
						next();
					}
				});
			}else{
				res.locals.settings =   settings;
				next();
			}
		});
		
		/** Before Filter **/
		router.use(FRONT_END_NAME+"api/",function(req, res, next) {
			res.header("Access-Control-Allow-Origin", "*");
  			res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
			res.header("Cache-Control", "no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0");
			res.header("authorization", '132465798dsfgfdsgdsfgdsfg')

			/** Read/write Basic settings from/in Cache **/
			let settings    = myCache.get( "settings" );
			if ( settings == undefined ){
				readFile(WEBSITE_ROOT_PATH+"config/settings.json", "utf8", function readFileCallback(err, data){
					if(err){
						next();
					}else{
						settings    		=    JSON.parse(data);
						myCache.set( "settings", settings, 0 );
						res.locals.settings =   settings;
						next();
					}
				});
			}else{
				res.locals.settings =   settings;
				next();
			}
		});

		/** This function is used to check user login or not **/
		isUserLogedInApi = (req, res, next) => {
			return new Promise((resolve) => {
				
				let token = false;
				if(req.headers["authorization"]) token = true
				if (!token){
					return res.send({
						status : API_STATUS_ERROR,
						message: "Invalid request, token does not exist",
						result : {},
						error  : "Invalid request, token does not exist"
					});
				}else{
					token = req.headers["authorization"]
				}
					
				/*** JWT verification */
				let jwt = require('jsonwebtoken');
				jwt.verify(token, JWT_CONFIG.private_key, { expiresIn: JWT_CONFIG.expire_time }, (err, decoded) => {
					let result = {}
					if (err) {
						if(err.name == "TokenExpiredError"){
							let JWTData = {user_id : (req.body.user_id) ? req.body.user_id : ObjectId()}
							result  = {user_id : (req.body.user_id) ? req.body.user_id : ObjectId(), token : generateJWT(JWTData)}; 
						}
						return res.send({
							status : API_STATUS_ERROR,
							message: err.name + ', ' + err.message,
							result : result,
							error  : err.name
						});
					} else {
						/*** User exist */
						let userId = (decoded.user_id) ? decoded.user_id : ObjectId();
						let deviceId = (req.body.device_id) ? req.body.device_id : "";
						let collection = db.collection('users');
						collection.findOne({ _id: ObjectId(userId) }, (err, result) => {
							if (!err && result && Object.keys(result).length > 0) {
								if(result.device_id && result.device_id != deviceId){
									return res.send({
										status : API_STATUS_ERROR,
										message: "front.user.login.already_login_with_another_device",
										// result : {},
										error  : "loginWithAnotherDevice"
									});
								}

								if (result.is_deleted == DELETED) {
									return res.send({
										status : API_STATUS_ERROR,
										message: "front.user.login.user_deleted",
										//result : {},
										error  : "front.user.login.user_deleted"
									});
									
								} else if (result.is_active == DEACTIVE) {
									return res.send({
										status : API_STATUS_ERROR,
										message: "front.user.login.account_deactivate_contact_to_admin",
										//result : {},
										error  : "front.user.login.account_deactivate_contact_to_admin"
									});
								} else {
									return next();
								}
							} else {
								return res.send({
									status: API_STATUS_ERROR,
									//result: {},
									statusCode: "user_authorized",
									message: 'Not an authorized user',
								})
							}
						})
					}
				});
			})
		};/** end isUserLogedInApi */

		/** Include API Middleware **/
		require(WEBSITE_MODULES_PATH+"home/routes");
		require(WEBSITE_MODULES_PATH+"user/routes");
	}
};
