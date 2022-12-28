function NewsletterSubscribers(){
	
	/**
	* Function for get list of newsletter subscribers
	*
	* @param req As Request Data
	* @param res As Response Data
	*
	* @return render/json
	*/
    this.getSubscriberList = (req, res)=>{
		if(isPost(req)){
			let limit			= 	(req.body.length) 	? 	parseInt(req.body.length) :ADMIN_LISTING_LIMIT;
			let skip			= 	(req.body.start)	?	parseInt(req.body.start)  :DEFAULT_SKIP;
			const collection	= 	db.collection("newsletter_subscribers");
			const async			= 	require("async");
			/** Configure DataTable conditions*/
			configDatatable(req,res,null).then(dataTableConfig=>{

				async.parallel([
					(callback)=>{
						/** Get list of subscriber's **/
						collection.find(dataTableConfig.conditions,{_id:1,email:1,status:1,is_subscribe:1,modified:1}).collation(COLLATION_VALUE).sort(dataTableConfig.sort_conditions).limit(limit).skip(skip).toArray((err, result)=>{
							callback(err, result);
						});
					},
					(callback)=>{
						/** Get total number of records in subscriber collection **/
						collection.find({}).count((err,countResult)=>{
							callback(err, countResult);
						});
					},
					(callback)=>{
						/** Get filtered records couting in subscriber **/
						collection.find(dataTableConfig.conditions).count((err,filterContResult)=>{
							callback(err, filterContResult);
						});
					}
				],
				(err,response)=>{
					/** Send response **/
					res.send({
						status			: (!err) ? STATUS_SUCCESS :STATUS_ERROR,
						draw			: dataTableConfig.result_draw,
						data			: (response[0]) ? response[0] :[],
						recordsTotal	: (response[1]) ? response[1] :0,
						recordsFiltered	: (response[2]) ? response[2] :0						
					});
				});
			});
		}else{
			/** render listing page **/
			req.breadcrumbs(BREADCRUMBS["admin/newsletter_subscribers/list"]);
			res.render("list");
		}
	};//End getSubscriberList()

	/**
	 * Function to add newsletter's subscriber
	 *
	 * @param req 	As 	Request Data
     * @param res 	As 	Response Data
     * @param next 	As 	Callback argument to the middleware function
	 *
	 * @return render/json
	 */
	this.addSubscriber = (req,res,next,optionVal={})=>{
		if(isPost(req)){
			/** Sanitize Data **/
			req.body 	=	sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);
			let email	=	(req.body.email)	?	req.body.email	:"";
			
			/** Check validation **/
			req.checkBody({
				"email": {
					notEmpty: true,
					errorMessage: res.__("admin.subscriber.please_enter_email"),
					isEmail: {
						errorMessage: res.__("admin.subscriber.please_enter_valid_email_address")
					},
				},
			});
			
			/** parse Validation array  **/
			let errors = parseValidation(req.validationErrors(),req);
			
			/** Send error response **/
			if(errors) return res.send({status : STATUS_ERROR,message : errors});
			
			/** Configure newsletter subscribers unique conditions **/
			const newsletter_subscribers = db.collection("newsletter_subscribers");
			newsletter_subscribers.findOne({
				email	:	{$regex : "^"+email+"$",$options:"i"}
			}, {_id:1,email:1},(err,result)=>{
				if(err) return next(err);
				
				/** Send error response if email already exists **/
				if(result){
					return res.send({
						status	: STATUS_ERROR, 
						message	: [{'param':'email','msg':res.__("admin.newsletter.your_email_id_is_already_exist")}]
					});
				}
				
				const crypto 	= 	require("crypto");
				let currentTime	= 	currentTimeStamp();
				let encId		=	crypto.createHash("md5").update(currentTime+email).digest("hex");
				
				/** Save newsletter subscribers data **/
				newsletter_subscribers.insertOne({
					email 			: 	email,
					status 			:  	ACTIVE,
					user_id 		: 	0,
					enc_id			:	encId,
					is_subscribe	:	SUBSCRIBED,
					modified 		: 	getUtcDate(),
					created 		: 	getUtcDate()
				},(insertErr,insertResult)=>{
					if(insertErr) return next(insertErr);
					let message = "";
					if(optionVal && optionVal.from == "api"){
						message = res.__("newsletter.subscrive_successfully_message");
					}else{
						message = res.__("admin.newsletter.newsletter_subscriber_has_been_added_successfully");
					}
					/** Send success response **/
					req.flash(STATUS_SUCCESS,message);
					res.send({
						status		: STATUS_SUCCESS,
						redirect_url: WEBSITE_ADMIN_URL+"newsletter_subscribers",
						message		: message,
					});

					if(optionVal && optionVal.from == "api"){
						sendMailToUsers(req,res,{
	                        email       :   email,
	                        event_type  :   USER_NEWS_LETTER_SUBSCRIPTION_EVENTS,
	                    });
					}
				});			
			});
		}else{
			/** Render add page **/
			req.breadcrumbs(BREADCRUMBS["admin/newsletter_subscribers/add"]);
			res.render("add");	
		}	
	};//End addSubscriber()

	/**
	 * Function for get newsletter subscriber's detail
	 *
	 * @param req	As Request Data
	 * @param res	As Response Data
	* @param next 	As 	Callback argument to the middleware function
	* 
	 * @return json
	 */
	let getSubscriberDetails = (req,res,next)=>{
		return new Promise(resolve=>{
			let subscriberId	=	(req.params.id)	?	req.params.id	:"";
			
			/** Get newsletter subscribers's detail **/
			const newsletter_subscribers = db.collection("newsletter_subscribers");
			newsletter_subscribers.findOne({_id : ObjectId(subscriberId)},(err, result)=>{
				if(err) return next(err);
				
				/** Send error response **/
				if(!result) return resolve({status : STATUS_ERROR, message	: res.__("admin.system.invalid_access")});
				
				/** Send success response **/
				resolve({
					status	: STATUS_SUCCESS,
					result	: result
				});
			});
		});
	};//End getSubscriberDetails()

	/**
	 * Function for update newsletter subscriber's detail
	 *
	 * @param req 	As 	Request Data
     * @param res 	As 	Response Data
     * @param next 	As 	Callback argument to the middleware function
	 *
	 * @return render/json
	 */
	this.editSubscriber = (req,res,next)=>{
		if(isPost(req)){
			/** Sanitize Data **/
			req.body 	= 	sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);
			let id 		= 	(req.params.id)		? 	req.params.id	:"";
			let email	= 	(req.body.email)	? 	req.body.email	:"";
			
			/** Check validation **/
			req.checkBody({
				"email": {
					notEmpty: true,
					errorMessage: res.__("admin.subscriber.please_enter_email"),
					isEmail: {
						errorMessage: res.__("admin.subscriber.please_enter_valid_email_address")
					},
				},
			});
			
			/** parse Validation array  **/
			let errors = parseValidation(req.validationErrors(),req);
			
			/** Send error response **/
			if(errors) return res.send({status	: STATUS_ERROR, message	: errors});
				
			/** Configure newsletter subscribers unique conditions **/
			const newsletter_subscribers = db.collection("newsletter_subscribers");
			newsletter_subscribers.findOne({
				_id   	: 	{$ne :ObjectId(id)},
				email	:	{$regex : "^"+email+"$",$options:"i"}
			},{_id:1,email:1},(err,result)=>{
				if(err) return next(err);
				
				/** Send error response if email already exists */
				if(result){
					return res.send({
						status	: STATUS_ERROR,
						message	: [{'param':'email','msg':res.__("admin.newsletter.your_email_id_is_already_exist")}],
					});
				}
				
				/** Update newsletter subscribers data **/
				newsletter_subscribers.updateOne({
					_id : ObjectId(id)
				},
				{$set : {
					email 		: 	email,
					modified	: 	getUtcDate()
				}},(updateErr,updateResult)=>{
					if(updateErr) return next(updateErr);
					
					/** Send success response **/
					req.flash(STATUS_SUCCESS,res.__("admin.newsletter.subscriber_has_been_updated_successfully"));
					res.send({
						status		: STATUS_SUCCESS,
						redirect_url: WEBSITE_ADMIN_URL+"newsletter_subscribers",
						message		: res.__("admin.newsletter.user_details_has_been_updated_successfully"),
					});
				});					
			});
		}else{
			/** Get subscriber details **/
			getSubscriberDetails(req, res,next).then(response=>{
				if(response.status != STATUS_SUCCESS){
					/** Send error response **/
					req.flash(STATUS_ERROR,response.message);
					return res.redirect(WEBSITE_ADMIN_URL+"newsletter_subscribers");
				}				
				
				/** Render edit page **/
				req.breadcrumbs(BREADCRUMBS["admin/newsletter_subscribers/edit"]);
				res.render("edit",{
					result : (response.result) ? response.result :{}
				});				
			}).catch(next);			
		}	
	};//End editSubscriber()

	/**
	 * Function for update newsletter subscriber's status
	 *
	 * @param req 	As 	Request Data
     * @param res 	As 	Response Data
     * @param next 	As 	Callback argument to the middleware function
	 *
	 * @return null
	 */
	this.updateSubscriberStatus = (req,res,next)=>{
		let subscriberId	= 	(req.params.id) 	?	req.params.id 		:"";
		let status	 		=	(req.params.status)	? 	req.params.status	:"";
		status	 			=	(status==ACTIVE) 	? 	DEACTIVE 			:ACTIVE;
		
		/** Update subscriber status **/
		const newsletter_subscribers = db.collection("newsletter_subscribers");
		newsletter_subscribers.updateOne({
			_id : ObjectId(subscriberId)
		},
		{$set :{
			status		:	status,
			modified 	:	getUtcDate()
		}},(err,result)=>{
			if(err) return next(err);
			
			/** Send success response **/
			req.flash(STATUS_SUCCESS,res.__("admin.subscriber.subscriber_status_has_been_updated_successfully"));
			res.redirect(WEBSITE_ADMIN_URL+"newsletter_subscribers");
		});
	};//End updateSubscriberStatus()

	/**
	 * Function for delete subscriber
	 *
	 * @param req 	As 	Request Data
     * @param res 	As 	Response Data
     * @param next 	As 	Callback argument to the middleware function
	 *
	 * @return null
	 */
	this.deleteSubscriber = (req,res)=>{
		let subscriberId	= (req.params.id) ? req.params.id :"";
		
		/** Delete subscriber **/
		const subscribers = db.collection("newsletter_subscribers");
		subscribers.deleteOne({_id: ObjectId(subscriberId)},(err,result)=>{
			if(err) return next(err);
			
			/** Send success response **/
			req.flash(STATUS_SUCCESS,res.__("admin.newsletter.subscriber_deleted_successfully"));
			res.redirect(WEBSITE_ADMIN_URL+"newsletter_subscribers");	
		});
	};//End deleteSubscriber()
}
module.exports = new NewsletterSubscribers();
