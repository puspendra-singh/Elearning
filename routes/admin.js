
/**
 * Admin.js
 *
 * This file is required by index.js. It sets up event listeners
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
		ObjectId	= require("mongodb").ObjectID;
		app 		= router;

		/*******************Initialize csrf module***********************/
		const csrf = require('csurf');
		csrfProtection = csrf({ cookie: true });
		/*******************Initialize csrf module end ***********************/

		/** Middlewares **/
		/** Function to check admin is logged in or not */
		checkLoggedInAdmin = function(req, res, next) {
			res.header("Cache-Control", "no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0");
			if(typeof req.session.user !== typeof undefined && typeof req.session.user._id !== typeof undefined && typeof req.session.user.user_role_id !== typeof undefined){
				if(req.session.user.user_role_id == SUPER_ADMIN_ROLE_ID){
					return next();
				}else if(req.session.user.user_role_id != FRONT_USER_ROLE_ID){
					let userId 			= (req.session.user._id) ? req.session.user._id : "";
					let currentPath 	= (req.route.path) 	? req.route.path 			: "";

					/**
					 *  Remove /admin/ from url
					 *  eg . url : "/admin/dashboard" after replace it will be "dashboard"
					 **/
					let currentSiteUrl 	= 	(req.url)	? req.url.replace("/"+ADMIN_NAME+"/","") : "";
					let moduleIds		=	userModuleFlagAction(userId,"","get");
					let validUrl		= 	false;

					/**
					 *  Add "/" (if not exists) after url
					 *  eg. /admin/master/faq = /admin/master/faq/
					 **/
					let fullSiteUrl	= (req.url) ? req.url : "";
					let tempUrlData = (fullSiteUrl) ? fullSiteUrl.split('/') : [];
					if(tempUrlData[tempUrlData.length-1] != "/"){
						fullSiteUrl	= fullSiteUrl+"/";
					}

					for(let i in moduleIds){
						let groupPath 		= (moduleIds[i].group_path) ? moduleIds[i].group_path.split(',') : [];
						let childs 			= (moduleIds[i].childs) 	? moduleIds[i].childs 	 	 		 : [];

						if(currentPath.constructor != Array){
							currentPath = [currentPath];
						}

						for(let m=0;m<currentPath.length;m++){
							let currentPathData = (currentPath[m]) ? currentPath[m].split('/') : [];

							/**
							 * path : /admin/dashboard ,
							 * path Data : [ '', 'admin', 'dashboard' ]
							 * active path is always on 2 index
							 * 0 index is blank 1 index is admin and 2 index is active path
							 **/
							let activePath		= (currentPathData[2]) 		? currentPathData[2] 				 : "";

							if(childs.length>0){
								for(let k in childs){
									let childGroupPath = (childs[k].group_path) ? childs[k].group_path.split(',') : [];
									for(let j in childGroupPath){
										let singleGroupPath = (childGroupPath[j]) ? childGroupPath[j] : '';

										if(activePath == singleGroupPath || currentSiteUrl == singleGroupPath || fullSiteUrl.indexOf("/"+singleGroupPath+"/") > -1){
											validUrl = true;
											break;
										}
									}
									if(validUrl){
										break;
									}
								}
							}else{
								for(let j in groupPath){
									let singleGroupPath = (groupPath[j]) ? groupPath[j] : '';
									if(activePath == singleGroupPath || currentSiteUrl == singleGroupPath){
										validUrl = true;
										break;
									}
								}
							}
							if(validUrl){
								break;
							}
						}
						if(validUrl){
							break;
						}
					}

					if(validUrl || currentSiteUrl == "dashboard" || currentSiteUrl == "edit_profile"){
						return next();
					}else{
						req.flash(STATUS_ERROR,res.__("admin.system.invalid_access"));
						res.redirect('/admin/dashboard');
					}
				}else{
					res.redirect(WEBSITE_ADMIN_URL+"login");
				}
			}else{
				res.redirect(WEBSITE_ADMIN_URL+"login");
			}
		}//end checkLoggedInAdmin();

		/** Function to check user is logged in or not **/
		checkLoggedIn = function(req, res, next) {
			res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
			if(typeof req.session.user !== typeof undefined && typeof req.session.user._id !== typeof undefined && typeof req.session.user.user_role_id !== typeof undefined){
				if (req.session.user.user_role_id == FRONT_USER_ROLE_ID){
					return next();
				}else{
					res.redirect('/');
				}
			}else{
				res.redirect('/');
			}
		}

		/** Function to check if user is logged in then redirect him/her to dashboard */
		isLoggedIn = function(req, res, next){
			res.header("Cache-Control", "no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0");
			if(typeof req.session !== typeof undefined && typeof req.session.user !== typeof undefined){
				if (typeof req.session.user._id !== typeof undefined && typeof req.session.user.user_role_id !== typeof undefined){
					if (req.session.user.user_role_id == FRONT_USER_ROLE_ID){
						if(req.session.user){
							return res.redirect(WEBSITE_URL+"dashboard");
						}
						return next();
					}else{
						res.redirect(WEBSITE_ADMIN_URL+"dashboard");
					}
				}else{
					return next();
				}
			}else{
				return next();
			}
		}

		/** Before Filter **/
		app.use(FRONT_END_NAME+ADMIN_NAME+"/",function(req, res, next) {
		
			/** Rendering options to set views and layouts */
			req.rendering = {};

			res.locals.auth 	= 	"";
			if(req.session.user !== "undefined" && req.session.user){
				res.locals.auth = req.session.user;
			}

			res.locals.site_url = 	req.url;

			/** Configure success flash message **/
			res.locals.success_flash_message	= "";
			res.locals.success_status			= "";

			/** Configure error flash message **/
			res.locals.error_flash_message	= "";
			res.locals.error_status			= "";

			if(typeof req.session.flash !== "undefined" && Object.keys(req.session.flash).length > NOT) {
				if(typeof req.session.flash.success !== "undefined") {
					res.locals.success_status			=	STATUS_SUCCESS;
					res.locals.success_flash_message 	=	req.session.flash.success;
				}
				if(typeof req.session.flash.error !== "undefined") {
					res.locals.error_status			=	STATUS_ERROR;
					res.locals.error_flash_message 	=	req.session.flash.error;
				}
			}

			/** Set default views folder path **/
			app.set("views", __dirname + "/views");

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

		/** admin route start here **/

		/** Admin Before Filter **/
		app.use(FRONT_END_NAME+ADMIN_NAME+"/",function(req, res, next) {
			res.locals.active_path 		=	req.path.split("/")[1];

			res.locals.admin_list_url 	= 	WEBSITE_ADMIN_URL+res.locals.active_path ;
			res.locals.breadcrumb		= 	req.breadcrumbs();

			/** Set default layout for admin **/
			req.rendering.layout = WEBSITE_ADMIN_LAYOUT_PATH+"default";

			/** Read/write admin Modules from/in Cache **/
			if(!isPost(req) && typeof req.session.user !== typeof undefined){
				let userId = (req.session.user._id) ? req.session.user._id : "";
				let moduleLists = userModuleFlagAction(userId,"","get");
				if ( moduleLists == undefined){
					const {getAdminModulesListing} = require(WEBSITE_ADMIN_MODULES_PATH+"admin_modules/model/admin_module");
					getAdminModulesListing(req,res).then(function(moduleResponse){
						res.locals.admin_modules_list = moduleResponse.result;
						userModuleFlagAction(userId,moduleResponse.result,"add");
						next();
					});
				}else{
					res.locals.admin_modules_list 	= moduleLists;
					next();
				}
			}else{
				res.locals.admin_modules_list =   [];
				next();
			}
		});

		

		/** Include Users Module **/
		require(WEBSITE_ADMIN_MODULES_PATH+"users/routes");

		/** Include Cms Module **/
		require(WEBSITE_ADMIN_MODULES_PATH+"cms/routes");

		/** Include Email Template Module **/
		require(WEBSITE_ADMIN_MODULES_PATH+"email_template/routes");

		/** Include Email Actions  Module **/
		require(WEBSITE_ADMIN_MODULES_PATH+"email_actions/routes");

		/** Include Email Logs Module **/
		//require(WEBSITE_ADMIN_MODULES_PATH+"email_logs/routes");

		/** Include Master Module **/
		require(WEBSITE_ADMIN_MODULES_PATH+"master/routes");

		/** Include Settings Module **/
		require(WEBSITE_ADMIN_MODULES_PATH+"settings/routes");

		/** Include Text Settings Module **/
		require(WEBSITE_ADMIN_MODULES_PATH+"text_setting/routes");

		/** Include admin role Module **/
		require(WEBSITE_ADMIN_MODULES_PATH+"admin_role/routes");

		/** Include admin permissions Module **/
		require(WEBSITE_ADMIN_MODULES_PATH+"admin_permissions/routes");

		/** Include admin modules Module **/
		require(WEBSITE_ADMIN_MODULES_PATH+"admin_modules/routes");

		/** Include contact Module **/
		require(WEBSITE_ADMIN_MODULES_PATH+"contact_us/routes");

		/** Include faq Module **/
		require(WEBSITE_ADMIN_MODULES_PATH+"faq/routes");

		/** Include testimonials Module **/
		require(WEBSITE_ADMIN_MODULES_PATH+"testimonial/routes");

		/** Include Course Module **/
		require(WEBSITE_ADMIN_MODULES_PATH+"courses/routes");

		/** Include other resource Module **/
		require(WEBSITE_ADMIN_MODULES_PATH+"other_resources/routes");

		/** Include other resource Module **/
		require(WEBSITE_ADMIN_MODULES_PATH+"video_lessons/routes");

		/** Include topics and units Module **/
		require(WEBSITE_ADMIN_MODULES_PATH+"units/routes");

		/** Include topics and notificaiton Module **/
		require(WEBSITE_ADMIN_MODULES_PATH+"notifications/routes");

		/** Include past papers Module **/
		require(WEBSITE_ADMIN_MODULES_PATH+"past_papers/routes");

		/** Include question Module **/
		require(WEBSITE_ADMIN_MODULES_PATH+"questions/routes");

		/** Include generate exam link Module **/
		require(WEBSITE_ADMIN_MODULES_PATH+"examinations/routes");

		/** Include subscription plans Module **/
		require(WEBSITE_ADMIN_MODULES_PATH+"subscription_plans/routes");

		/** Include newsletter Module **/
		require(WEBSITE_ADMIN_MODULES_PATH+"newsletter/newsletter_subscriber_routes");
		require(WEBSITE_ADMIN_MODULES_PATH+"newsletter/newsletter_template_routes");
		require(WEBSITE_ADMIN_MODULES_PATH+"newsletter/scheduled_newsletter_routes");

		/** Route is used to render 404 page admin*/
		app.get(FRONT_END_NAME+ADMIN_NAME+"/*", function(req, res){
			let layout404 = WEBSITE_ADMIN_LAYOUT_PATH+"404";
			if(res.locals.auth && res.locals.auth._id){
				layout404 = WEBSITE_ADMIN_LAYOUT_PATH+"default";
			}
			/** Set current view folder **/
			req.rendering.views		=	WEBSITE_ADMIN_MODULES_PATH+"elements/";

			/** Set layout  404 **/
			req.rendering.layout	=	layout404;

			/**Render 404 page*/
			res.render("404");
		});

		
		/** Error Handling */
		app.use(function (err,req,res,next) {

			if(!req.rendering) req.rendering = {};

			/**Handle csrf error */
			if (err.code === 'EBADCSRFTOKEN'){
				logger('CSRF TOKEN Error handeled in web.js routing');
				return res.send({
					status 	: STATUS_ERROR,
					is_csrf	: true,
					message	: res.__("system.something_going_wrong_please_try_again")
				});
			}

			if(err.stack){
				console.error(err.stack);
			}else{
				console.error(err);
			}

			let currentPanel = (req.path.split("/")[1]) ? req.path.split("/")[1] : "";
			if(req.method == "POST"){
				/** If request is from admin panel */
				if(currentPanel == ADMIN_NAME){
					/** This response is work for both listing requests and other requests */
					return res.send({
						status: STATUS_ERROR,
						message:res.__("admin.system.something_going_wrong_please_try_again"),
						draw: 0,
						data: [],
						recordsFiltered: 0,
						recordsTotal: 0
					});
				}else{

					return res.send({
						status: STATUS_ERROR,
						message:res.__("admin.system.something_going_wrong_please_try_again"),
					});
				}
			}

			let	viewPath	 = "";
			/* If request is from admin panel */
			if(currentPanel == ADMIN_NAME){
				/* Set view path to elements folder in admin panel */
				viewPath = WEBSITE_ADMIN_MODULES_PATH+"elements/";
				/* Set layout path */
				let layout404 = WEBSITE_ADMIN_LAYOUT_PATH+"404";
				if(res.locals.auth && res.locals.auth._id){
					layout404 = WEBSITE_ADMIN_LAYOUT_PATH+"default";
				}
				/** Set layout  404 **/
				req.rendering.layout	=	layout404;

				/** Set current view folder **/
				req.rendering.views		=	viewPath;

				/**Render error page*/
				return res.render("error");
			}else{
				viewPath = WEBSITE_MODULES_PATH+"elements/";
				/* Set layout path */
				layout404 = WEBSITE_LAYOUT_PATH+"default";


				if(!req.rendering) req.rendering = {};

				/** Set layout  404 **/
				req.rendering.layout	=	layout404;

				/** Set current view folder **/
				req.rendering.views		=	viewPath;

				/**Render error page*/
				res.render("error");
			}
		});
	}
};
