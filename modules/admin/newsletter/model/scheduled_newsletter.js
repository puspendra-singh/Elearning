function ScheduledNewsletter() {

	/**
	 * Function for get list of scheduled newsletter templates
	 *
	 * @param req As Request Data
	 * @param res As Response Data
	 *
	 * @return render/json
	 */
	this.scheduledNewsletter = (req, res)=>{
		if(isPost(req)){
			let limit			= 	(req.body.length) 	? 	parseInt(req.body.length) 	:ADMIN_LISTING_LIMIT;
			let skip			= 	(req.body.start) 	? 	parseInt(req.body.start) 	:DEFAULT_SKIP;
			const collection	= 	db.collection("scheduled_newsletters");
			const async			= 	require("async");
			
			configDatatable(req,res,null).then(dataTableConfig=>{
				async.parallel([
					(callback)=>{
						/** Get list of newsletters **/
						collection.find(dataTableConfig.conditions,{subject:1,modified:1,is_send:1,scheduled_date:1}).collation(COLLATION_VALUE).sort(dataTableConfig.sort_conditions).limit(limit).skip(skip).toArray((err,result)=>{
							callback(err, result);
						});
					},
					(callback)=>{
						/** Get total number of records in newsletters collection **/
						collection.find({}).count((err,countResult)=>{
							callback(err, countResult);
						});
					},
					(callback)=>{
						/** Get filtered records couting in newsletters **/
						collection.find(dataTableConfig.conditions).count((err,filterContResult)=>{
							callback(err, filterContResult);
						});
					}
				],
				(err, response)=>{
					/** Send response **/
					res.send({
						status			: 	(!err)	? STATUS_SUCCESS :STATUS_ERROR,
						draw			:	dataTableConfig.result_draw,
						data			: 	(response[0]) ? response[0] :[],
						recordsFiltered	:  	(response[2]) ? response[2] :0,
						recordsTotal	:	(response[1]) ? response[1] :0
					});
				});
			});
		}else{
			/** render listing page **/
			req.breadcrumbs(BREADCRUMBS["admin/scheduled_newsletter/list"]);
			res.render('list');
		}
	}; //End scheduledNewsletter()
	
	/**
	 * Function to get detail of newsletter 
	 *
	 * @param req	As Request Data
	 * @param res	As Response Data
	 * @param next 	As Callback argument to the middleware function
	 *
	 * @return json
	 */
	let scheduledDetails = (req,res,next)=>{
		return new Promise(resolve=>{
			let newsletterId = (req.params.id) ? req.params.id :"";
			
			/** Get scheduled newsletters details **/
			const scheduled_newsletters = db.collection("scheduled_newsletters");
			scheduled_newsletters.findOne({
				_id 	: ObjectId(newsletterId),
				is_send : NOT_SENT
			},(err, result)=>{
				if(err) return next(err);
				
				/** Send error response */
				if(!result) return resolve({status	: STATUS_ERROR,message	: res.__("admin.system.invalid_access")});
				
				/** Send success response */
				resolve({
					status	: STATUS_SUCCESS,
					result	: result
				});
			});
		});
	};//End scheduledDetails()

	/**
	 * Function for edit scheduled email template
	 *
	 * @param req	As Request Data
	 * @param res	As Response Data
	 * @param next 	As Callback argument to the middleware function
	 *
	 * @return render/json
	 */
	this.editScheduledNewsletter = (req, res,next)=>{
		let newsletterId = (req.params.id) ? req.params.id :"";
		if(isPost(req)){
			/** Sanitize Data **/
			req.body 	= 	sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);
			
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
			let pageBody 	= 	(req.body.body)	? req.body.body	:"";
			req.body.scheduled_date	=	(allData.scheduled_date)	? allData.scheduled_date:"";
			req.body.subscriber_list=	(allData.subscriber_list)	? allData.subscriber_list 	:[];
			
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
			
			let subscriberList		= 	(req.body.subscriber_list)	?	req.body.subscriber_list	:[];
			subscriberList			= 	(subscriberList && subscriberList.constructor !== Array) ? [subscriberList]	:subscriberList;
			let subscriberConditions=	{};
			
			if(subscriberList.length >0){
				let tempSubscriberId  = subscriberList.map(records=>{
											return (records) ? ObjectId(records) :"";
										});
				subscriberConditions["_id"]	=	{$in :tempSubscriberId};
			}
			
			/** Get newsletter subscribers list **/
			const newsletter_subscribers = db.collection("newsletter_subscribers");
			newsletter_subscribers.distinct( "_id",subscriberConditions,(subscribersErr,subscribersIds)=>{
				if(subscribersErr) return next(subscribersErr);
				
				if(!subscribersIds) return res.send({status : STATUS_ERROR,message : [{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again")}]});
				
				/** Update scheduled newsletters details **/
				const scheduled_newsletters = db.collection("scheduled_newsletters");
				scheduled_newsletters.updateOne({
					_id : ObjectId(newsletterId)
				},
				{$set: {
					scheduled_date			:	(req.body.scheduled_date) 			? 	getUtcDate(req.body.scheduled_date)	:"",
					subject					:	(req.body.subject)					?	req.body.subject 					:"",
					body 					:	pageBody,
					subscribers				:	subscribersIds,
					newsletter_descriptions :	(allData.newsletter_descriptions) 	?	allData.newsletter_descriptions 	:{},
					modified 				: 	getUtcDate(),
				}},(updateErr,updateResult)=>{
					if(updateErr) return next(updateErr);
					
					/** Send success response */
					req.flash('success',res.__("admin.scheduled_newsletter.newsletter_has_been_updated_successfully"));
					res.send({
						status 		: STATUS_SUCCESS,
						redirect_url: WEBSITE_ADMIN_URL+'scheduled_newsletters',
						message 	: res.__("admin.scheduled_newsletter.newsletter_has_been_updated_successfully")
					});
				});	
			});
		}else{
			const async	= require("async");
			async.parallel([
				(callback)=>{
					/** Get scheduled newsletter details**/
					scheduledDetails(req,res,next).then(scheduledResponse=>{
						callback(null, scheduledResponse);
					}).catch(next);
				},
				(callback)=>{
					getLanguages().then(languageList=>{
						callback(null, languageList);
					}).catch(next);
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
			],(err, response)=>{
				if(err) return next(err);
				
				if(!response || !response[0] || response[0]["status"] != STATUS_SUCCESS){
					/** Send error response **/
					req.flash(STATUS_ERROR,response[0]["message"]);
					return res.redirect(WEBSITE_ADMIN_URL+"scheduled_newsletters");
				}
				
				if(!response[2] || response[2].length <=0){
					/** Send error response **/
					req.flash(STATUS_ERROR,res.__("admin.scheduled_newsletter.no_subscriber_found"));
					return res.redirect(WEBSITE_ADMIN_URL+"scheduled_newsletters");
				}
				
				/** Render scheduled edit page **/
				req.breadcrumbs(BREADCRUMBS['admin/scheduled_newsletter/edit']);
				res.render('edit',{
					result			:	(response[0]["result"])	?	response[0]["result"]	:{},
					language_list	:	(response[1])			?	response[1]				:[],
					subscriber_list	:	(response[2])			?	response[2]				:[],
				});
			});
		}
	};//End editScheduledNewsletter()

	/**
	 * Function for delete scheduled newsletter
	 *
	 * @param req	As Request Data
	 * @param res	As Response Data
	 * @param next 	As Callback argument to the middleware function
	 *
	 * @return null
	 */
	this.deleteScheduledNewsletter = (req,res,next)=>{
		let newsletterId = (req.params.id) ? req.params.id :"";
			
		/** Delete scheduled newsletters **/
		const scheduled_newsletters = db.collection("scheduled_newsletters");
		scheduled_newsletters.deleteOne({_id: ObjectId(newsletterId),is_send : NOT_SENT},(err,result)=>{
			if(err) return next(err);
			
			/** Send success response **/
			req.flash(STATUS_SUCCESS,res.__("admin.scheduled_newsletter.newsletter_scheduled_deleted_successfully"));
			res.redirect(WEBSITE_ADMIN_URL+"scheduled_newsletters");	
		});
	};//End deleteScheduledNewsletter()
}
module.exports = new ScheduledNewsletter();
