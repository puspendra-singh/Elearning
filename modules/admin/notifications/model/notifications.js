const async  = 	require("async");
const clone			= require("clone");
const { ObjectId } = require("mongodb");
function Notification(req,res){

	/** Function to get list **/
	this.list	=	(req,res,next)=>{
		if(isPost(req)){
			let limit = (req.body.length) ? parseInt(req.body.length):	DEFAULT_LIMIT; 
			let skip  = (req.body.start)  ? parseInt(req.body.start) :	DEFAULT_SKIP;
			let draw  = (req.body.draw)   ? parseInt(req.body.draw)	 :	DEFAULT_SKIP;
			
			let commonCondition= {}
			configDatatable(req,res,null).then(configDataTable=>{
				configDataTable.conditions	=	Object.assign(configDataTable.conditions, commonCondition);
				const collection  =  db.collection("notification_templates");
				async.parallel({
					userList : (callback)=>{
						collection.find(configDataTable.conditions,{}
						).sort(configDataTable.sort_condition).skip(skip).limit(limit).toArray((err, result)=>{
							callback(err, result);
						});
					},
					recordsTotol : (callback)=>{
						collection.countDocuments(commonCondition,{},(err, result)=> {
							callback(err, result)
						});
					},
					recordsfiltered : (callback)=>{
						collection.countDocuments(configDataTable.conditions,{},(err, result)=> {
							callback(err, result)
						});
					},
				},(err, response)=>{
					
					/** Send error message*/
					if(err) return next(err);
					
					res.send({
						status	 		: STATUS_SUCCESS,
						draw			: draw,
						data 	 		: (response.userList) ? response.userList : [],
						recordsTotal 	: (response.recordsTotol) ? response.recordsTotol : 0,
						recordsFiltered : (response.recordsfiltered) ? response.recordsfiltered : 0,
					});
				});
			});	
		}else{
			req.breadcrumbs(BREADCRUMBS['admin/notifications/list']);
			res.render('list',{
				breadcrumbs	:	req.breadcrumbs()
			});
		}
	}//End list

	
	/**
	 * Function to get plan's detail
	 *
	 * @param req	As	Request Data
	 * @param res	As	Response Data
	 * @param next	As 	Callback argument to the middleware function
	 *
	 * @return json
	 */
	 let getNotificationDetails = (req,res,next)=>{
		return new Promise(resolve=>{
			let notificationId = (req.params.id) ? req.params.id : "";
			/** Get notification details **/
			const collection = db.collection('notification_templates');
			collection.findOne({
					_id : ObjectId(notificationId)
				},
				{projection: {
					_id:1,name:1,is_active:1,
					subject:1,description:1,modified:1,created:1
				}},(err, result)=>{
					if(err) return next(err);
					if(!result){
						/** Send error response **/
						let response = {
							status	: STATUS_ERROR,
							message	: res.__("admin.system.invalid_access")
						};
						return resolve(response);
					}

					/** Send success response **/
					let response = {
						status	: STATUS_SUCCESS,
						result	: result
					};
					resolve(response);
				}
			);
		});
	};// End getNotificationDetails().

	/**
	 * Function to update plan's detail
	 *
	 * @param req 	As 	Request Data
	 * @param res 	As 	Response Data
	 * @param next 	As 	Callback argument to the middleware function
	 *
	 * @return render/json
	 */
	this.editDetail = (req, res,next)=>{
		if(isPost(req)){
			/** Sanitize Data **/
			req.body	= sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);
			let id		= (req.params.id) ? req.params.id :"";

			if(req.body.notification_descriptions === undefined || req.body.notification_descriptions[DEFAULT_LANGUAGE_MONGO_ID] === undefined || req.body.notification_descriptions[DEFAULT_LANGUAGE_MONGO_ID] == ''){
				/** Send error response */
				return res.send({
					status	: STATUS_ERROR,
					message	: [{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again")}]
				});
			}

			let languageData		=	clone(req.body.notification_descriptions[DEFAULT_LANGUAGE_MONGO_ID]);
			req.body.subject			= 	(languageData.subject) ? 	languageData.subject 	:"";
			req.body.description	= 	(languageData.description) ? languageData.description 	:"";

			/** Check validation */
			req.checkBody({
				'subject': {
					notEmpty: true,
					isLength	:	{
						options		: {min:TITLE_MIN_LENGTH,max:TITLE_MAX_LENGTH},
						errorMessage: res.__("admin.notifications.please_enter_title_min_max",TITLE_MIN_LENGTH,TITLE_MAX_LENGTH)
					},
					errorMessage: res.__("admin.notifications.please_enter_subject")
				},
				'description': {
					notEmpty: true,
					isLength	:	{
						options		: {min:DESCRIPTION_MIN_LENGTH,max:DESCRIPTION_MAX_LENGTH},
						errorMessage: res.__("admin.notifications.please_enter_description_min_max",DESCRIPTION_MIN_LENGTH,DESCRIPTION_MAX_LENGTH)
					},
					errorMessage: res.__("admin.notifications.please_enter_description")
				},
				'name': {
					notEmpty: true,
					isLength:{
                        options: {
                            min    : NAME_MIN_LENGTH,
                            max    : NAME_MAX_LENGTH,
                        },
                        errorMessage: res.__("admin.user.please_enter_name_min_max",NAME_MIN_LENGTH,NAME_MAX_LENGTH)
                    },
                    matches	 : {
                        options    	: NAME_ALPHANUMERIC_REGEX,
                        errorMessage:res.__("front.user.invalid_name")
                    },
					errorMessage: res.__("admin.notifications.please_enter_name")
				}
			});


			let name			= 	(req.body.name)			?	req.body.name	:"";
			let subject			= 	(req.body.subject)			?	req.body.subject	:"";
			let description		= 	(req.body.description)		?	req.body.description	:"";

			if(description!= ""){
				description.replace(new RegExp(/&nbsp;|<br \/\>|<p>|<\/p>/g),' ').trim();
			}

			/** parse Validation array  **/
			let errors = parseValidation(req.validationErrors(),req);
			if (errors) {
				/** Send error response **/
				return res.send({
					status	: STATUS_ERROR,
					message	: errors,
				});
			}

			/** Update notificaiton details **/
			const collection = db.collection("notification_templates");
			collection.updateOne({
					_id : ObjectId(id)
				},
				{$set: {
					name				:	name,
					subject				:	subject,
					description			: 	description,
					modified 			:	getUtcDate()
				}},(err,result)=>{
					if(err) return next(err);

					/** Send success response **/
					req.flash(STATUS_SUCCESS,res.__("admin.notification.notification_has_been_updated_successfully"));
					res.send({
						status			: STATUS_SUCCESS,
						redirect_url	: WEBSITE_ADMIN_URL+'notifications',
						message			: res.__("admin.notification.notification_has_been_updated_successfully"),
					});
				}
			);
		}else{
			/** Get language list **/
			getLanguages().then(languageList=>{
				/** Get details **/
				getNotificationDetails(req,res,next).then(response=>{
					if(response.status != STATUS_SUCCESS){
						/** Send error response **/
						req.flash(STATUS_ERROR,response.message);
						res.redirect(WEBSITE_ADMIN_URL+'subscription_plans');
						return;
					}

					/** Render edit page **/
					req.breadcrumbs(BREADCRUMBS['admin/notifications/edit']);
					res.render('edit',{
						result			: 	response.result,
						language_list	:	languageList
					});
				}).catch(next);
			}).catch(next);
		}
	};//End editDetail()

	/**
	 * Function for add notification
	 *
	 * @param req 	As	Request Data
	 * @param res 	As	Response Data
	 * @param next 	As 	Callback argument to the middleware function
	 *
	 * @return render/json
	 */
	this.addDetail = (req, res,next)=>{
		if(isPost(req)){
			/** Sanitize Data */
			req.body = 	sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);
			if(req.body.notification_descriptions === undefined || req.body.notification_descriptions[DEFAULT_LANGUAGE_MONGO_ID] === undefined || req.body.notification_descriptions[DEFAULT_LANGUAGE_MONGO_ID] == ''){
				/** Send error response */
				return res.send({
					status	: STATUS_ERROR,
					message	: [{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again")}]
				});
			}

			let languageData		=	clone(req.body.notification_descriptions[DEFAULT_LANGUAGE_MONGO_ID]);
			req.body.subject		= 	(languageData.subject) ? 	languageData.subject 	:"";
			req.body.description	= 	(languageData.description) ? languageData.description 	:"";

			/** Check validation */
			req.checkBody({
				'subject': {
					notEmpty: true,
					isLength	:	{
						options		: {min:TITLE_MIN_LENGTH,max:TITLE_MAX_LENGTH},
						errorMessage: res.__("admin.notifications.please_enter_title_min_max",TITLE_MIN_LENGTH,TITLE_MAX_LENGTH)
					},
					errorMessage: res.__("admin.notifications.please_enter_subject")
				},
				'description': {
					notEmpty: true,
					isLength	:	{
						options		: {min:DESCRIPTION_MIN_LENGTH,max:DESCRIPTION_MAX_LENGTH},
						errorMessage: res.__("admin.notifications.please_enter_description_min_max",DESCRIPTION_MIN_LENGTH,DESCRIPTION_MAX_LENGTH)
					},
					errorMessage: res.__("admin.notifications.please_enter_description")
				},
				'name': {
					notEmpty: true,
					isLength:{
                        options: {
                            min    : NAME_MIN_LENGTH,
                            max    : NAME_MAX_LENGTH,
                        },
                        errorMessage: res.__("admin.user.please_enter_name_min_max",NAME_MIN_LENGTH,NAME_MAX_LENGTH)
                    },
                    matches	 : {
                        options    	: NAME_ALPHANUMERIC_REGEX,
                        errorMessage:res.__("front.user.invalid_name")
                    },
					errorMessage: res.__("admin.notifications.please_enter_name")
				}
			});

			let name			= 	(req.body.name)				?	req.body.name	:"";
			let subject			= 	(req.body.subject)			?	req.body.subject	:"";
			let description		= 	(req.body.description)		?	req.body.description	:"";

			if(description!= ""){
				description.replace(new RegExp(/&nbsp;|<br \/\>|<p>|<\/p>/g),' ').trim();
			}

			/** parse Validation array  */
			let errors = parseValidation(req.validationErrors(),req);
			if (errors) {
				/** Send error response */
				return res.send({
					status	: STATUS_ERROR,
					message	: errors,
				});
			}

			/** Save notification details */
			const collection = db.collection('notification_templates');
			collection.insertOne({
				name				:	name,
				subject				:	subject,
				description			: 	description,
				is_active           :   ACTIVE,
				created 			: 	getUtcDate(),
				modified 			: 	getUtcDate()
			},(err,result)=>{
				if(err) return next(err);

				/** Send success response */
				req.flash(STATUS_SUCCESS,res.__("admin.notification.notification_has_been_added_successfully"));
				res.send({
					status			: STATUS_SUCCESS,
					redirect_url	: WEBSITE_ADMIN_URL+'notifications',
					message			: res.__("admin.notification.notification_has_been_added_successfully")
				});
			});
			
		}else{
			/** Get language list */
			getLanguages().then(languageList=>{
				req.breadcrumbs(BREADCRUMBS['admin/notifications/add']);
				/**Render add plan page */
				res.render('add',{
					language_list	: languageList
				});
			}).catch(next);
		}
	};//End addDetail()

		/**
	 * Function for add notification
	 *
	 * @param req 	As	Request Data
	 * @param res 	As	Response Data
	 * @param next 	As 	Callback argument to the middleware function
	 *
	 * @return render/json
	 */
	this.saveNotification = (req, res,next)=>{
		if(isPost(req)){
			/** Sanitize Data */
			req.body = 	sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);

			/** Check validation */
			req.checkBody({
				'subject': {
					notEmpty: true,
					isLength	:	{
						options		: {min:TITLE_MIN_LENGTH,max:TITLE_MAX_LENGTH},
						errorMessage: res.__("admin.notifications.please_enter_title_min_max",TITLE_MIN_LENGTH,TITLE_MAX_LENGTH)
					},
					errorMessage: res.__("admin.notifications.please_enter_subject")
				},
				'description': {
					notEmpty: true,
					isLength	:	{
						options		: {min:DESCRIPTION_MIN_LENGTH,max:DESCRIPTION_MAX_LENGTH},
						errorMessage: res.__("admin.notifications.please_enter_description_min_max",DESCRIPTION_MIN_LENGTH,DESCRIPTION_MAX_LENGTH)
					},
					errorMessage: res.__("admin.notifications.please_enter_description")
				},
				'name': {
					notEmpty: true,
					isLength:{
						options: {
							min    : NAME_MIN_LENGTH,
							max    : NAME_MAX_LENGTH,
						},
						errorMessage: res.__("admin.user.please_enter_name_min_max",NAME_MIN_LENGTH,NAME_MAX_LENGTH)
					},
					matches	 : {
						options    	: NAME_ALPHANUMERIC_REGEX,
						errorMessage:res.__("front.user.invalid_name")
					},
					errorMessage: res.__("admin.notifications.please_enter_name")
				}
			});

			let name			= 	(req.body.name)				?	req.body.name	:"";
			let subject			= 	(req.body.subject)			?	req.body.subject	:"";
			let description		= 	(req.body.description)		?	req.body.description	:"";

			if(description!= ""){
				description.replace(new RegExp(/&nbsp;|<br \/\>|<p>|<\/p>/g),' ').trim();
			}

			/** parse Validation array  */
			let errors = parseValidation(req.validationErrors(),req);
			if (errors) {
				/** Send error response */
				return res.send({
					status	: STATUS_ERROR,
					message	: errors,
				});
			}

			/** Save notification details */
			const collection = db.collection('notification_templates');
			collection.insertOne({
				name				:	name,
				subject				:	subject,
				description			: 	description,
				is_active           :   ACTIVE,
				created 			: 	getUtcDate(),
				modified 			: 	getUtcDate()
			},(err,result)=>{
				if(err) return next(err);

				/** Send success response */
				req.flash(STATUS_SUCCESS,res.__("admin.notification.notification_has_been_added_successfully"));
				res.send({
					status			: STATUS_SUCCESS,
					redirect_url	: WEBSITE_ADMIN_URL+'notifications',
					message			: res.__("admin.notification.notification_has_been_added_successfully")
				});
			});
			
		}else{
			/** Get language list */
			getLanguages().then(languageList=>{
				req.breadcrumbs(BREADCRUMBS['admin/notifications/add']);
				/**Render add plan page */
				res.render('add',{
					language_list	: languageList
				});
			}).catch(next);
		}
	};//End saveNotification()


	/** Function to update status **/
	this.updateStatus	=	function(req,res){
		var id		=	(req.params.id)		?	req.params.id	:'';
		var status	=	(req.params.status == ACTIVE)	?	INACTIVE :ACTIVE;
		const users	=	db.collection("notification_templates");
		users.updateOne(
			{_id	: ObjectId(id)},
			{$set:{
				is_active	:	status,
				modified	:	new Date()
			}},function(errUser, resultUser){
				if(!errUser){
					req.flash(STATUS_SUCCESS,res.__('admin.user.status_has_been_updated_successfully'));
					res.redirect(WEBSITE_ADMIN_URL+'notifications');
				}else{
					req.flash(STATUS_ERROR,res.__('admin.system.something_went_wrong'));
					res.redirect(WEBSITE_ADMIN_URL+'notifications');
				}
			}
		)
	}//End updateStatus


	/** Function is used to send notification
	 * 
	 */
	this.sendNotification = function(req, res, next){
		/** Sanitize Data */
		req.body = 	sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);

		let notificationId 	= (req.params.id) ? req.params.id : ObjectId();
		let selectedRows 	= (req.body.selected_rows) ? req.body.selected_rows : [];
		let subject 		= (req.body.subject) ? req.body.subject : "";
		let description 	= (req.body.description) ? req.body.description :"";
		let usersObjectId  	= [];

		let searchCondition = {
			"is_active" 	:	ACTIVE,
			"is_deleted" 	: 	NOT_DELETED,
			"user_role_id" 	: 	FRONT_USER_ROLE_ID,
			"fcm_key"   	: 	{$exists : true}
		}

		if(selectedRows.length > NOT){
			/** Sanitize Data */
			req.body = 	sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);

			/** Check validation */
			req.checkBody({
				'subject': {
					notEmpty: true,
					isLength	:	{
						options		: {min:TITLE_MIN_LENGTH,max:TITLE_MAX_LENGTH},
						errorMessage: res.__("admin.notifications.please_enter_title_min_max",TITLE_MIN_LENGTH,TITLE_MAX_LENGTH)
					},
					errorMessage: res.__("admin.notifications.please_enter_subject")
				},
				'description': {
					notEmpty: true,
					isLength	:	{
						options		: {min:DESCRIPTION_MIN_LENGTH,max:DESCRIPTION_MAX_LENGTH},
						errorMessage: res.__("admin.notifications.please_enter_description_min_max",DESCRIPTION_MIN_LENGTH,DESCRIPTION_MAX_LENGTH)
					},
					errorMessage: res.__("admin.notifications.please_enter_description")
				}
			});

			if(description!= ""){
				description.replace(new RegExp(/&nbsp;|<br \/\>|<p>|<\/p>/g),' ').trim();
			}

			/** parse Validation array  */
			let errors = parseValidation(req.validationErrors(),req);
			if (errors) {
				/** Send error response */
				return res.send({
					status	: STATUS_ERROR,
					message	: errors,
				});
			}
			selectedRows.map(records=>{
				usersObjectId.push(ObjectId(records))
			})
			searchCondition['_id'] = {$in : usersObjectId}
		}


		async.parallel({
			userList : (callback)=>{
				let users = db.collection("users");
				users.aggregate([
					{$match:searchCondition},
					{$group:{
						_id : "$user_role_id",
						fcm_keys : {$push: "$fcm_key"},
						user_ids : {$push: "$_id"}
					}}
				]).toArray((err, result)=>{
					result = (result && result.length > NOT) ? result[0] : {}
					callback(err, result);
				});
			},
			notification : (callback)=>{
				let notificaitons = db.collection("notification_templates");
				notificaitons.findOne({_id : ObjectId(notificationId)},{},(err, result)=> {
					callback(err, result)
				});
			}
		},(err, response)=>{
			console.log(response,"dfsdfsdfdsfdsf");
			/** Send error message*/
			if(err) return next(err);

			let fcmKeys 			= (response.userList) ? response.userList["fcm_keys"] : [];
			let userIds 			= (response.userList) ? response.userList["user_ids"] : [];
			let notificaitonDetail 	= (response.notification) ? response.notification : {};

			/** Send notification data */
			let sendOptions = {
				to 		: fcmKeys,
				title 	: (notificaitonDetail.subject) ? notificaitonDetail.subject : subject,
				message : (notificaitonDetail.description) ? notificaitonDetail.description : description
			}
			sendNotifications(sendOptions)

			/** Save notification */
			let saveOptions = {
				users 	: userIds,
				title 	: (notificaitonDetail.subject) ? notificaitonDetail.subject : subject,
				message : (notificaitonDetail.description) ? notificaitonDetail.description : description
			}	
			saveNotifications(req, res, saveOptions).then(responseNotification=>{
				if(responseNotification.status == STATUS_SUCCESS){
					if(req.body && selectedRows.length > NOT){
						/** Send success response */
						req.flash(STATUS_SUCCESS,res.__("admin.notifications.notification_has_been_sent_successfully"));
						return res.send({
							status			: STATUS_SUCCESS,
							redirect_url	: WEBSITE_ADMIN_URL+'users',
							message			: res.__("admin.notifications.notification_has_been_sent_successfully")
						});
					}else{
						req.flash(STATUS_SUCCESS,res.__('admin.notifications.notification_has_been_sent_successfully'));
						res.redirect(WEBSITE_ADMIN_URL+'notifications');
					}
				}else{
					if(req.body && selectedRows.length > NOT){
						/** Send success response */
						req.flash(STATUS_SUCCESS,res.__("admin.system.something_went_wrong"));
						return res.send({
							status			: STATUS_ERROR,
							redirect_url	: WEBSITE_ADMIN_URL+'users',
							message			: res.__("admin.system.something_went_wrong")
						});
					}else{
						req.flash(STATUS_ERROR,res.__('admin.system.something_went_wrong'));
						res.redirect(WEBSITE_ADMIN_URL+'notifications');
					}
				}
			});
		});
	} // End sendNotification
}	
module.exports	=	new Notification();
