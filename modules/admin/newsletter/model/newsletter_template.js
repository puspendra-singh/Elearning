function Newsletter() {

	/**
	 * Function for get list of newsletter templates
	 *
	 * @param req As Request Data
	 * @param res As Response Data
	 *
	 * @return render/json
	 */
	this.getTemplateList = (req, res)=>{
		if(isPost(req)){
			let limit			= 	(req.body.length) 	? 	parseInt(req.body.length) 	:ADMIN_LISTING_LIMIT;
			let skip			= 	(req.body.start) 	? 	parseInt(req.body.start) 	:DEFAULT_SKIP;
			const collection	= 	db.collection("newsletter_templates");
			const async			= 	require("async");
			
			configDatatable(req,res,null).then(dataTableConfig=>{
				async.parallel([
					(callback)=>{
						/** Get list of newsletter templates **/
						collection.find(dataTableConfig.conditions,{_id:1,name:1,subject:1,modified:1}).collation(COLLATION_VALUE).sort(dataTableConfig.sort_conditions).limit(limit).skip(skip).toArray((err,result)=>{
							callback(err, result);
						});
					},
					(callback)=>{
						/** Get total number of records in newsletter_templates collection **/
						collection.find({}).count((err,countResult)=>{
							callback(err, countResult);
						});
					},
					(callback)=>{
						/** Get filtered records couting in newsletter_templates **/
						collection.find(dataTableConfig.conditions).count((err,filterContResult)=>{
							callback(err, filterContResult);
						});
					}
				],(err, response)=>{
					/** Send response **/
					res.send({
						status			: 	(!err) ? STATUS_SUCCESS :STATUS_ERROR,
						draw			:	dataTableConfig.result_draw,
						data			: 	(response[0]) ? response[0] :[],
						recordsTotal	:	(response[1]) ? response[1] :0,
						recordsFiltered	:  	(response[2]) ? response[2] :0						
					});
				});
			});
		}else{
			/** render listing page **/
			req.breadcrumbs(BREADCRUMBS["admin/newsletter_template/list"]);
			res.render('list');
		}
	}; //End getTemplateList()

	/**
	 * Function add newsletter templates
	 *
	 * @param req	As Request Data
	 * @param res	As Response Data
	 * @param next 	As Callback argument to the middleware function
	 *
	 * @return render/json
	 */
	this.addNewsletterTemplate = (req, res,next)=>{
		if(isPost(req)){
			/** Sanitize Data **/
			req.body 	= 	sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);
			console.log( req.body, "req.body")
			if(typeof req.body.newsletter_descriptions === undefined || typeof req.body.newsletter_descriptions[ENGLISH_LANGUAGE_CODE] === undefined || req.body.newsletter_descriptions[ENGLISH_LANGUAGE_CODE] == ""){
				/** Send error response **/
				return res.send({
					status	: STATUS_ERROR,
					message	: [{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again")}]
				});
			}
			
			const clone		= 	require('clone');
			let allData		=	req.body;

			console.log(allData.newsletter_descriptions, "allData.newsletter_descriptions")

			req.body		=	clone(allData.newsletter_descriptions[ENGLISH_LANGUAGE_CODE]);
			req.body.name	=	(allData.name)	? allData.name 	:"";
			let pageBody 	= 	(req.body.body)	? req.body.body	:"";

			/** Check validation **/
			req.checkBody({
				"name": {
					notEmpty: true,
					errorMessage: res.__("admin.newsletter_template.please_enter_name")
				},
				"subject": {
					notEmpty: true,
					errorMessage: res.__("admin.newsletter_template.please_enter_subject")
				},
				"body": {
					notEmpty: true,
					errorMessage: res.__("admin.newsletter_template.please_enter_email_body")
				}
			});

			if(pageBody!= ""){
				req.body.body =  pageBody.replace(new RegExp(/&nbsp;|<br \/\>/g)," ").trim();
			}

			/** parse Validation array  **/
			let errors = parseValidation(req.validationErrors(),req);

			/** Send error response **/
			if(errors) return res.send({status : STATUS_ERROR, message : errors});

			/** Add newsletter templates **/
			const newsletter_templates = db.collection("newsletter_templates");

			newsletter_templates.findOne({
				name: req.body.name
			}, { _id: 1, name: 1 },
				(err, result) => {
					if (err) return next(err);
					let errMessageArray = [];
					if (result) {
						let templateName = (result.name) ? result.name : "";
						let enteredTemplateName = (req.body.name) 	? 	req.body.name 		:"";
						if (templateName == enteredTemplateName) {
							errMessageArray.push({ 'param': 'name', 'msg': res.__("admin.name.this_record_already_here") });
						}
					}
					if (errMessageArray.length > 0) {
						/** Send error response **/
						return res.send({
							status: STATUS_ERROR,
							message: errMessageArray,
						});
					}
					newsletter_templates.insertOne({
						name					:	(req.body.name) 	? 	req.body.name 		:"",
						subject					:	(req.body.subject)	?	req.body.subject	:"",
						body 					:	pageBody,
						newsletter_descriptions	:	(allData.newsletter_descriptions) ?	allData.newsletter_descriptions	:{},
						modified 				: 	getUtcDate(),
						created 				:	getUtcDate()
					},(err,result)=>{
						if(err) return next(err);

						/** Send success response */
						req.flash('success',res.__("admin.newsletter.newsletter_template_has_been_added_successfully"));
						res.send({
							status 			: STATUS_SUCCESS,
							redirect_url 	: WEBSITE_ADMIN_URL+'newsletter_templates',
							message 		: res.__("admin.newsletter.newsletter_template_has_been_added_successfully")
						});
					});
				});
		}else{
			/** Get language list */
			getLanguages().then((languageList)=>{
				/** Render add page **/
				req.breadcrumbs(BREADCRUMBS['admin/newsletter_template/add']);
				res.render('add',{
					language_list	: languageList
				});
			});
		}
	};//End addNewsletterTemplate()
	
	/**
	 * Function to get detail of newsletter template
	 *
	 * @param req	As Request Data
	 * @param res	As Response Data
	 * @param next 	As Callback argument to the middleware function
	 *
	 * @return json
	 */
	let templateDetails = (req,res,next)=>{
		return new Promise(resolve=>{
			let templateId	 	= (req.params.id)	?	req.params.id	:"";
			
			/** Get newsletter templates details **/
			const newsletter_templates = db.collection("newsletter_templates");
			newsletter_templates.findOne({
				_id : ObjectId(templateId)
			},
			{
				_id:1,name:1,subject:1,action:1,body:1,modified:1,newsletter_descriptions:1
			},(err, result)=>{
				if(err) return next(err);
				
				/** Send error response **/
				if(!result) return resolve({status : STATUS_ERROR, message : res.__("admin.system.invalid_access")});
				
				/** Send Success response */
				resolve({
					status	: STATUS_SUCCESS,
					result	: result
				});
			});
		});
	};//End templateDetails()
	
	/**
	 * Function for update newsletter templates
	 *
	 * @param req	As Request Data
	 * @param res	As Response Data
	 * @param next 	As Callback argument to the middleware function
	 *
	 * @return render/json
	 */
	this.editNewsletterTemplate = (req, res,next)=>{
		if(isPost(req)){
			/** Sanitize Data **/
			req.body 	= 	sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);
			let id 		= 	(req.params.id) ? req.params.id :"";

			if(id =="" || typeof req.body.newsletter_descriptions === typeof undefined || (typeof req.body.newsletter_descriptions[ENGLISH_LANGUAGE_CODE] === typeof undefined || !req.body.newsletter_descriptions[ENGLISH_LANGUAGE_CODE] || req.body.newsletter_descriptions[ENGLISH_LANGUAGE_CODE] =="")){
				/** Send error response **/
				return res.send({
					status	: STATUS_ERROR,
					message	: [{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again")}]
				});
			}

			const clone		= 	require('clone');
			let allData		=	req.body;
			req.body		=	clone(allData.newsletter_descriptions[ENGLISH_LANGUAGE_CODE]);
			req.body.name	=	(allData.name)	? allData.name 	:"";
			let pageBody 	= 	(req.body.body)	? req.body.body	:"";

			/** Check validation **/
			req.checkBody({
				"name": {
					notEmpty: true,
					errorMessage: res.__("admin.newsletter_template.please_enter_name")
				},
				"subject": {
					notEmpty: true,
					errorMessage: res.__("admin.newsletter_template.please_enter_subject")
				},
				"body": {
					notEmpty: true,
					errorMessage: res.__("admin.newsletter_template.please_enter_email_body")
				}
			});

			if(pageBody!= ""){
				req.body.body =  pageBody.replace(new RegExp(/&nbsp;|<br \/\>/g)," ").trim();
			}
			
			/** parse Validation array  **/
			let errors = parseValidation(req.validationErrors(),req);

			/** Send error response **/
			if(errors) return res.send({status : STATUS_ERROR, message : errors});

			/** Update newsletter templates details **/
			const newsletter_templates = db.collection("newsletter_templates");

			newsletter_templates.findOne({
				name: req.body.name,
				_id: { $ne: ObjectId(id) },
			}, { _id: 1, name: 1 },(err, result) => {
					if (err) return next(err);
					let errMessageArray = [];
					if (result) {
						let templateName = (result.name) ? result.name : "";
						let enteredTemplateName = (req.body.name) 	? 	req.body.name 		:"";
						if (templateName == enteredTemplateName) {
							errMessageArray.push({ 'param': 'name', 'msg': res.__("admin.name.this_record_already_here") });
						}
					}
					if (errMessageArray.length > 0) {
						/** Send error response **/
						return res.send({
							status: STATUS_ERROR,
							message: errMessageArray,
						});
					}
					newsletter_templates.updateOne({
						_id : ObjectId(id)
					},
					{$set: {
						name					:	(req.body.name) 		? 	req.body.name 		:"",
						subject					:	(req.body.subject)		?	req.body.subject 	:"",
						body 					:	pageBody,
						newsletter_descriptions	:	(allData.newsletter_descriptions)	?	allData.newsletter_descriptions	:{},
						modified				:	getUtcDate()
					}},(err,result)=>{
						if(err) return next(err);

						/** Send Success response **/
						req.flash(STATUS_SUCCESS,res.__("admin.newsletter_template.newsletter_template_has_been_updated_successfully"));
						res.send({
							status: STATUS_SUCCESS,
							redirect_url : WEBSITE_ADMIN_URL+"newsletter_templates",
							message: res.__("admin.newsletter_template.newsletter_template_has_been_updated_successfully"),
						});

					});
			});
		}else{
			/** Get template details **/
			templateDetails(req, res,next).then((response)=>{
				if(response.status != STATUS_SUCCESS){
					/** Send error response **/
					req.flash(STATUS_ERROR,response.message);
					return res.redirect(WEBSITE_ADMIN_URL+"newsletter_templates");
				}

				/** Get language list **/
				getLanguages().then(languageList=>{
					/** Render edit page*/
					req.breadcrumbs(BREADCRUMBS["admin/newsletter_template/edit"]);
					res.render('edit',{
						result			: response.result,
						language_list	: languageList
					});
				});
			});
		}
	};//End editNewsletterTemplate()

	/**
	 * Function for delete newsletter template
	 *
	 * @param req	As Request Data
	 * @param res	As Response Data
	 * @param next 	As Callback argument to the middleware function
	 *
	 * @return null
	 */
	this.deleteNewsletterTemplate = (req,res,next)=>{
		let templateId = (req.params.id) ? req.params.id :"";

		/** Delete newsletter template **/
		const newsletter_templates = db.collection("newsletter_templates");
		newsletter_templates.deleteOne({_id: ObjectId(templateId)},(err,result)=>{
			if(err) return next(err);

			/** Send success response **/
			req.flash(STATUS_SUCCESS,res.__("admin.newsletter.newsletter_deleted_successfully"));
			res.redirect(WEBSITE_ADMIN_URL+"newsletter_templates");
		});
	};//End deleteNewsletterTemplate()

	/**
	 * Function for send/schedule newsletter template
	 *
	 * @param req	As Request Data
	 * @param res	As Response Data
	 * @param next 	As Callback argument to the middleware function
	 *
	 * @return render/json
	 */
	this.sendNewsletterTemplate = (req, res,next)=>{
		if(isPost(req)){
			/** Sanitize Data **/
			req.body 		= 	sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);
			let templateId	= 	(req.params.id) ? req.params.id : "";
			
			if(typeof req.body.newsletter_descriptions === typeof undefined || (typeof req.body.newsletter_descriptions[DEFAULT_LANGUAGE_MONGO_ID] === typeof undefined || !req.body.newsletter_descriptions[DEFAULT_LANGUAGE_MONGO_ID] || req.body.newsletter_descriptions[DEFAULT_LANGUAGE_MONGO_ID] =="")){
				/** Send error response **/
				return res.send({
					status	: STATUS_ERROR,
					message	: [{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again")}]
				});
			}
			
			const clone		= 	require('clone');
			let allData		=	req.body;
			req.body		=	clone(allData.newsletter_descriptions[DEFAULT_LANGUAGE_MONGO_ID]);
			req.body.scheduled_date	=	(allData.scheduled_date)	? allData.scheduled_date 	:"";
			req.body.subscriber_list=	(allData.subscriber_list)	? allData.subscriber_list 	:[];
			let pageBody 	= 	(req.body.body)	? req.body.body	:"";
			
			/** Check validation **/
			req.checkBody({
				"scheduled_date": {
					notEmpty: true,
					errorMessage: res.__("admin.newsletter_template.please_enter_scheduled_date")
				},
				"subject": {
					notEmpty: true,
					errorMessage: res.__("admin.newsletter_template.please_enter_subject")
				},
				"body": {
					notEmpty: true,
					errorMessage: res.__("admin.newsletter_template.please_enter_email_body")
				}
			});

			if(pageBody!= ""){
				req.body.body =  pageBody.replace(new RegExp(/&nbsp;|<br \/\>/g)," ").trim();
			}
			
			/** parse Validation array  **/
			let errors = parseValidation(req.validationErrors(),req);
			
			 /** Send error response **/
			if (errors) return res.send({status : STATUS_ERROR, message : errors});
			
			let subscriberList	= 	(req.body.subscriber_list)	?	req.body.subscriber_list 	:[];
			subscriberList		= 	(subscriberList && subscriberList.constructor !== Array) ? [subscriberList] :subscriberList;
			
			let subscriberConditions = {};
			if(subscriberList.length >0){
				let tempSubscriberId = 	subscriberList.map(records=>{
											return records ? ObjectId(records) :'';
										});
				subscriberConditions["_id"]	=	{$in :tempSubscriberId};
			}
			
			/** Get newsletter subscribers list **/
			const newsletter_subscribers = db.collection("newsletter_subscribers");
			newsletter_subscribers.distinct("_id",subscriberConditions,(subscriberErr,subscriberResult)=>{
				if(subscriberErr) return next(subscriberErr);
				
				if(!subscriberResult) return res.send({status : STATUS_ERROR,message : [{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again")}]});
				/** Add scheduled_newsletters details **/
				const scheduled_newsletters = db.collection("scheduled_newsletters");
				scheduled_newsletters.insertOne({
					newsletter_template_id 	:	ObjectId(templateId),
					scheduled_date			:	(req.body.scheduled_date) 			? 	getUtcDate(req.body.scheduled_date)	:"",
					subject					:	(req.body.subject)					?	req.body.subject 					:"",
					subscribers				:	subscriberResult,
					body 					:	pageBody,
					is_send 				:	NOT_SENT,
					newsletter_descriptions :	(allData.newsletter_descriptions) 	?	allData.newsletter_descriptions 	:{},
					modified 				: 	getUtcDate(),
					created 				:	getUtcDate()
				},(insertErr,insertResult)=>{
					if(insertErr) return next(insertErr); 
					
					/** Send success response */
					req.flash('success',res.__("admin.newsletter.scheduled_newsletter_has_been_added_successfully"));
					res.send({
						status 			: STATUS_SUCCESS,
						redirect_url 	: WEBSITE_ADMIN_URL+'scheduled_newsletters',
						message 		: res.__("admin.newsletter.scheduled_newsletter_has_been_added_successfully")
					});	
				});	
			});	
		}else{
			const async	= require("async");
			async.parallel([
				(callback)=>{
					/** Get template details **/
					templateDetails(req,res,next).then(templateResponse=>{
						callback(null,templateResponse);
					}).catch(next);
				},
				(callback)=>{
					/** get languages list **/
					getLanguages().then(languageList=>{
						callback(null,languageList);
					});
				},
				(callback)=>{
					/** Get newsletter subscribers details **/
					const newsletter_subscribers = db.collection("newsletter_subscribers");
					newsletter_subscribers.aggregate([
						{$match : {
							status 		: ACTIVE,
							is_subscribe: SUBSCRIBED,
						}},
						{$lookup : {
							"from" 			: "users",
							"localField"	: "user_id",
							"foreignField"	: "_id",
							"as" 			: "user_detail"
						}},
						{$project : {
							user_name: 	{$cond: {
								if  : 	{$eq: ["$user_id", 0]}, 
								then:  	{$concat: [NEWSLETTER_DEFAULT_USER_NAME, " < ", "$email"," >" ]}, 
								else: 	{$concat: [{"$arrayElemAt" : ["$user_detail.full_name",0]}, " < ","$email" ," >" ]} 
							}}
						}},
						{$sort : {user_name :  SORT_ASC}}
					]).toArray((err, result)=>{
						callback(err,result);
					});
				},
			],(err,response)=>{
				if(err) return next(err);
				
				if(!response || !response[0] || response[0]["status"] != STATUS_SUCCESS){
					/** Send error response **/
					req.flash(STATUS_ERROR,response[0]["message"]);
					return res.redirect(WEBSITE_ADMIN_URL+"newsletter_templates");
				}
				
				if(!response[2] || response[2].length <=0){
					/** Send error response **/
					req.flash(STATUS_ERROR,res.__("admin.scheduled_newsletter.no_subscriber_found"));
					return res.redirect(WEBSITE_ADMIN_URL+"newsletter_templates");
				}
				
				/** Render newsletter send page **/
				req.breadcrumbs(BREADCRUMBS['admin/newsletter_template/send']);
				res.render('send',{
					result			: (response[0]["result"]) 	? response[0]["result"] :{},
					subscriber_list : (response[2]) 			? response[2]			:[],
					language_list	: (response[1]) 			? response[1]			:[],
				});				
			});
		}
	};//End sendNewsletterTemplate()
}
module.exports = new Newsletter();
