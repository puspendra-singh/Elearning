const asyncParallel	= 	require("async/parallel");
const clone			= 	require('clone');

function Email() {

	/**
	 * Function for get list of email templates
	 *
	 * @param req 	As 	Request Data
	 * @param res 	As 	Response Data
	 * @param next 	As 	Callback argument to the middleware function
	 *
	 * @return render/json
	 */
	this.getTemplateList = (req, res, next)=>{
		if(isPost(req)){
			let limit			= 	(req.body.length) 	? 	parseInt(req.body.length) 	:ADMIN_LISTING_LIMIT;
			let skip			= 	(req.body.start) 	? 	parseInt(req.body.start) 	:DEFAULT_SKIP;
			const collection	= 	db.collection("email_templates");

			configDatatable(req,res,null).then(dataTableConfig=>{
				/** Set conditions **/
				let commonConditions = {
					$or : [
						{is_visible : { $exists : false }},
						{is_visible : { $ne : NOT_VISIBLE} }
					]
				};
				dataTableConfig.conditions = Object.assign(dataTableConfig.conditions,commonConditions);
				asyncParallel([
					(callback)=>{
						/** Get list of email templates **/
						collection.find(dataTableConfig.conditions,{projection: {_id:1,name:1,subject:1,modified:1}}).collation(COLLATION_VALUE).sort(dataTableConfig.sort_conditions).limit(limit).skip(skip).toArray((err,result)=>{
							callback(err, result);
						});
					},
					(callback)=>{
						/** Get total number of records in email_templates collection **/
						collection.countDocuments(commonConditions,(err,countResult)=>{
							callback(err, countResult);
						});
					},
					(callback)=>{
						/** Get filtered records couting in email_templates **/
						collection.countDocuments(dataTableConfig.conditions,(err,filterContResult)=>{
							callback(err, filterContResult);
						});
					}
				],(err, response)=>{
					/** Send response **/
					res.send({
						status			: 	(!err) 		? STATUS_SUCCESS : STATUS_ERROR,
						draw			:	dataTableConfig.result_draw,
						data			: 	(response[0]) ? response[0] : [],
						recordsFiltered	:  	(response[2]) ? response[2] : 0,
						recordsTotal	:	(response[1]) ? response[1] : 0
					});
				});
			});
		}else{
			/** render listing page **/
			req.breadcrumbs(BREADCRUMBS["admin/email_template/list"]);
			res.render('list');
		}
	}; //End getTemplateList()

	/**
	 * Function to get detail of email template
	 *
	 * @param req 	As 	Request Data
	 * @param res 	As 	Response Data
	 * @param next 	As 	Callback argument to the middleware function
	 *
	 * @return json
	 */
	let templateDetails = (req, res, next)=>{
		return new Promise(resolve=>{
			let templateId	 	= (req.params.id)	?	req.params.id	:"";

			/** Get email template details **/
			const email_templates = db.collection("email_templates");
			email_templates.findOne({
				_id : ObjectId(templateId)
			},
			{projection: {
				_id:1,name:1,subject:1,action:1,body:1,modified:1,email_descriptions:1
			}},(err, result)=>{
				if(err) return next(err);

				/** Send error response */
				if(!result) return resolve({status	: STATUS_ERROR, message	: res.__("admin.system.invalid_access")});

				/** Send Success response */
				resolve({
					status	: STATUS_SUCCESS,
					result	: result
				});
			});
		});
	};//End templateDetails()

	/**
	 * Function for update email template
	 *
	 * @param req 	As 	Request Data
	 * @param res 	As 	Response Data
	 * @param next 	As 	Callback argument to the middleware function
	 *
	 * @return render/json
	 */
	this.editEmailTemplate = (req,res,next)=>{
		if(isPost(req)){
			/** Sanitize Data **/
			req.body 	= 	sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);
			let id 		= 	(req.params.id) ? req.params.id : "";

			if(id =="" || typeof req.body.email_descriptions === typeof undefined || (typeof req.body.email_descriptions[DEFAULT_LANGUAGE_MONGO_ID] === typeof undefined || !req.body.email_descriptions[DEFAULT_LANGUAGE_MONGO_ID] || req.body.email_descriptions[DEFAULT_LANGUAGE_MONGO_ID] =="")){
				/** Send error response **/
				return res.send({
					status	: STATUS_ERROR,
					message	: [{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again")}]
				});
			}

			let allData		=	req.body;
			req.body		=	clone(allData.email_descriptions[DEFAULT_LANGUAGE_MONGO_ID]);
			req.body.name	=	(allData.name)	? allData.name 	:"";
			let pageBody 	= 	(req.body.body)	? req.body.body	:"";

			/** Check validation **/
			req.checkBody({
				"name": {
					notEmpty: true,
					errorMessage: res.__("admin.email_template.please_enter_name")
				},
				"subject": {
					notEmpty: true,
					errorMessage: res.__("admin.email_template.please_enter_subject")
				},
				"body": {
					notEmpty: true,
					errorMessage: res.__("admin.email_template.please_enter_email_body")
				}
			});

			if(pageBody) req.body.body =  pageBody.replace(new RegExp(/&nbsp;|<br \/\>/g)," ").trim();

			/** parse Validation array  **/
			let errors = parseValidation(req.validationErrors(),req);

			/** Send error response **/
			if(errors) return res.send({status : STATUS_ERROR, message : errors});

			/** Update record **/
			const email_templates = db.collection("email_templates");
			email_templates.updateOne({
				_id : ObjectId(id)
			},
			{$set: {
				name				:	(req.body.name) 		? 	req.body.name 		:"",
				subject				:	(req.body.subject)		?	req.body.subject 	:"",
				body 				:	pageBody,
				email_descriptions	:	(allData.email_descriptions) ? allData.email_descriptions :{},
				modified			:	getUtcDate()
			}},(err,result)=>{
				if(err) return next(err);

				/** Send Success response **/
				req.flash(STATUS_SUCCESS,res.__("admin.email_template.email_template_has_been_updated_successfully"));
				res.send({
					status: STATUS_SUCCESS,
					redirect_url : WEBSITE_ADMIN_URL+"email_template",
					message: res.__("admin.email_template.email_template_has_been_updated_successfully"),
				});
			});
		}else{
			asyncParallel({
				template_details : (callback)=>{
					/** Get email template details **/
					templateDetails(req, res, next).then(response=>{
						callback(null,response);
					}).catch(next);
				},
				language_list : (callback)=>{
					/** Get language list **/
					getLanguages(DEFAULT_LANGUAGE_MONGO_ID).then(languageList=>{
						callback(null,languageList);
					});
				},
			},(err,response)=>{
				if(!response || !response.template_details || !response.template_details.status || response.template_details.status != STATUS_SUCCESS){
					req.flash(STATUS_ERROR,res.__("admin.system.invalid_access"));
					return res.redirect(WEBSITE_ADMIN_URL+"email_template");
				}

				/** Render edit page*/
				req.breadcrumbs(BREADCRUMBS["admin/email_template/edit"]);
				res.render('edit',{
					result			: (response.template_details.result)	?	response.template_details.result	:{},
					language_list	: (response.language_list) ? response.language_list :[]
				});
			});
		}
	};//End editEmailTemplate()

	/**
	 * Function for add email template
	 *
	 * @param req 	As 	Request Data
	 * @param res 	As 	Response Data
	 * @param next 	As 	Callback argument to the middleware function
	 *
	 * @return render/json
	 */
	this.addEmailTemplate = (req,res,next)=>{
		if(isPost(req)){
			/** Sanitize Data **/
			req.body 	= 	sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);

			if(typeof req.body.email_descriptions === undefined || typeof req.body.email_descriptions[DEFAULT_LANGUAGE_MONGO_ID] === undefined || req.body.email_descriptions[DEFAULT_LANGUAGE_MONGO_ID] == ""){
				/** Send error response **/
				return res.send({
					status	: STATUS_ERROR,
					message	: [{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again")}]
				});
			}

			let allData		=	req.body;
			req.body		=	clone(allData.email_descriptions[DEFAULT_LANGUAGE_MONGO_ID]);
			req.body.name	=	(allData.name)		? 	allData.name 	:"";
			req.body.action	=	(allData.action)	? 	allData.action 	:"";
			let pageBody 	= 	(req.body.body)		? 	req.body.body	:"";
			let action 		= 	(req.body.action)	? 	req.body.action	:"";

			/** Check validation **/
			req.checkBody({
				"name": {
					notEmpty: true,
					errorMessage: res.__("admin.email_template.please_enter_name")
				},
				"action": {
					notEmpty: true,
					errorMessage: res.__("admin.email_template.please_select_action")
				},
				"subject": {
					notEmpty: true,
					errorMessage: res.__("admin.email_template.please_enter_subject")
				},
				"body": {
					notEmpty: true,
					errorMessage: res.__("admin.email_template.please_enter_email_body")
				}
			});

			if(pageBody) req.body.body =  pageBody.replace(new RegExp(/&nbsp;|<br \/\>/g)," ").trim();

			/** parse Validation array  **/
			let errors = parseValidation(req.validationErrors(),req);

			/** Send error response **/
			if(errors) return res.send({status : STATUS_ERROR, message : errors});

			/** Check action is unique **/
			const email_templates = db.collection("email_templates");
			email_templates.findOne({
				action	:	{$regex : '^'+cleanRegex(action)+'$',$options : 'i'}
			},{projection: {_id:1}},(err, result)=>{
				if(err) return next(err);

				if(result){
					return res.send({
						status	:	STATUS_ERROR,
						message	: 	[{param:"action",msg:res.__("admin.email_template.email_template_already_exists")}]
					});
				}

				/** Save email template details  **/
				email_templates.insertOne({
					name				:	(req.body.name) 	?	req.body.name		:"",
					subject				:	(req.body.subject) 	? 	req.body.subject	:"",
					action				:	(req.body.action) 	? 	req.body.action		:"",
					body				:	(req.body.body) 	? 	req.body.body		:"",
					email_descriptions	:	(allData.email_descriptions) ? allData.email_descriptions :{},
					created 			:	getUtcDate(),
					modified 			: 	getUtcDate()
				},(addErr,addResult)=>{
					if(addErr) return next(addErr);

					/** Send Success response **/
					req.flash(STATUS_SUCCESS,res.__("admin.email_template.email_template_has_been_added_successfully"));
					res.send({
						status: STATUS_SUCCESS,
						redirect_url : WEBSITE_ADMIN_URL+"email_template",
						message: res.__("admin.email_template.email_template_has_been_added_successfully"),
					});
				});
			});
		}else{
			asyncParallel([
				(callback)=>{
					/** Set options for get email action list **/
					let options = {
						collections : [{
							collection 	: 	"email_actions",
							columns 	: 	["action","action"],
							conditions 	: 	{},
						}]
					};

					/** Get email action list **/
					getDropdownList(req,res,next,options).then(actionResponse=>{
						if(actionResponse.status != STATUS_SUCCESS) return callback(actionResponse.status,"");

						let actionList = (actionResponse && actionResponse.final_html_data && actionResponse.final_html_data["0"])	?	actionResponse.final_html_data["0"]:"";
						callback(null,actionList);
					});
				},
				(callback)=>{
					/** Get language list **/
					getLanguages(DEFAULT_LANGUAGE_MONGO_ID).then(languageList=>{
						callback(null,languageList);
					});
				},
			],(err,response)=>{
				if(err) return next(err);

				/** Render add page*/
				req.breadcrumbs(BREADCRUMBS["admin/email_template/add"]);
				res.render('add',{
					email_action_list	: (response && response[0]) ? response[0] :"",
					language_list		: (response && response[1]) ? response[1] :[],
				});
			});
		}
	};//End addEmailTemplate()

	/**
	 * Function for get email action options
	 *
	 * @param req 	As 	Request Data
	 * @param res 	As 	Response Data
	 * @param next 	As 	Callback argument to the middleware function
	 *
	 * @return render/json
	 */
	this.getEmailActionOptions = (req,res,next)=>{
		let emailAction = (req.body.action) ? req.body.action:"";

		if(!emailAction){
			/** Send error response **/
			return res.send({
				status	: STATUS_ERROR,
				message	: res.__("admin.system.something_going_wrong_please_try_again")
			});
		}

		/** Get email template details **/
		const email_actions = db.collection("email_actions");
		email_actions.findOne({
				action : emailAction
			},
			{projection: {
				_id:1,options:1
			}},(err, result)=>{
				if(err) return next(err);

				/** Send Success response */
				res.send({
					status	: STATUS_SUCCESS,
					result	: (result.options) ? result.options.split(",") : []
				});
			}
		);
	};// end getEmailActionOptions()
}
module.exports = new Email();











