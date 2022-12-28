const asyncParallel	= require("async/parallel");

function emailActions() {

	/**
	 * Function to  get email action list
	 *
	 * @param req As Request Data
	 * @param res As Response Data
	 *
	 * @return render/json
	 */
	this.list = (req, res)=>{
		if(isPost(req)){
			let limit			= 	(req.body.length)	? parseInt(req.body.length)	: ADMIN_LISTING_LIMIT;
			let skip			= 	(req.body.start)	? parseInt(req.body.start)	: DEFAULT_SKIP;
			const collection	=	db.collection('email_actions');

			/** Configure datatable conditions*/
			configDatatable(req,res,null).then(dataTableConfig=>{
				asyncParallel([
					(callback)=>{
						/** Get list of email actions **/
						collection.find(dataTableConfig.conditions,{projection: {_id:1,action:1,options:1,}}).collation(COLLATION_VALUE).sort(dataTableConfig.sort_conditions).limit(limit).skip(skip).toArray((err,result)=>{
							callback(err, result);
						});
					},
					(callback)=>{
						/** Get total number of records in email actions collection **/
						collection.countDocuments({},(err,countResult)=>{
							callback(err, countResult);
						});
					},
					(callback)=>{
						/** Get filtered records counting in email actions **/
						collection.countDocuments(dataTableConfig.conditions,(err,filterContResult)=>{
							callback(err, filterContResult);
						});
					}
				],(err, response)=>{
					/** Send response **/
					res.send({
						status			: (!err) ? STATUS_SUCCESS : STATUS_ERROR,
						draw			: dataTableConfig.result_draw,
						data			: (response[0]) ? response[0] : [],
						recordsFiltered	: (response[2]) ? response[2] : 0,
						recordsTotal	: (response[1]) ? response[1] : 0
					});
				});
			});
		}else{
			/** render listing page **/
			req.breadcrumbs(BREADCRUMBS['admin/email_actions/list']);
			res.render('list');
		}
	};//End list()

	/**
	 * Function for add email actions
	 *
	 * @param req 	As 	Request Data
	 * @param res 	As 	Response Data
	 * @param next 	As 	Callback argument to the middleware function
	 *
	 * @return render/json
	 */
   	this.add=(req, res,next)=>{
		if(isPost(req)){
			/** Sanitize Data **/
			req.body =	sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);

			/** Check validation **/
			req.checkBody({
				'action':{
					notEmpty: true,
					errorMessage: res.__("admin.email_actions.please_enter_action")
				},
				"options":{
					notEmpty: true,
					errorMessage: res.__("admin.email_actions.please_enter_options")
				},
			});

			/**parse Validation array  **/
			let errors = parseValidation(req.validationErrors(),req);

			/** Send error response **/
			if(errors) return res.send({status : STATUS_ERROR, message : errors});

			/*** Save Email action details ***/
			const email_actions = db.collection("email_actions");
			email_actions.insertOne({
				action 	: (req.body.action)	 ?	req.body.action	 :"",
				options	: (req.body.options) ?	req.body.options :"",
			},(error,qryResult)=>{
				if(error) return next(error);

				/** Send success response **/
				req.flash(STATUS_SUCCESS,res.__("admin.email_actions.email_actions_has_been_added_successfully"));
				res.send({
					status		 : 	STATUS_SUCCESS,
					redirect_url : 	WEBSITE_ADMIN_URL+"email_actions",
					message		 :	res.__("admin.email_actions.email_actions_has_been_added_successfully")
				});
			});
		}else{
			/** Render add file **/
			req.breadcrumbs(BREADCRUMBS['admin/email_actions/add']);
			res.render('add');
		}
	};//End add()

	/**
	 * Function to get email actions details
	 *
	 * @param req 	As 	Request Data
	 * @param res 	As 	Response Data
	 * @param next 	As 	Callback argument to the middleware function
	 *
	 * @return json
	 */
	let getEmailActionsDetails = (req,res,next)=>{
		return new Promise(resolve=>{
			let id = (req.params.id) ? req.params.id : "";

			/** Get email actions details **/
			const email_actions = db.collection('email_actions');
			email_actions.findOne({_id : ObjectId(id)},{projection: {_id:1,action:1,options:1}},(err, result)=>{
				if(err)  return next(err);
				if(!result) return resolve({status : STATUS_ERROR, message : res.__("admin.system.invalid_access")});

				/** Send success response **/
				resolve({status : STATUS_SUCCESS, result:result});
			});
		});
	};// End getEmailActionsDetails()

	/**
	 * Function for edit email actions details
	 *
	 * @param req 	As 	Request Data
	 * @param res 	As 	Response Data
	 * @param next 	As 	Callback argument to the middleware function
	 *
	 * @return null
	 */
	this.edit =(req, res,next)=>{
		let id 	= (req.params.id) ? req.params.id :"";
		if(isPost(req)){
			/** Sanitize Data **/
			req.body =	sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);

			/** Check validation **/
			req.checkBody({
				'action': {
					notEmpty: true,
					errorMessage: res.__("admin.email_actions.please_enter_action")
				},
				'options': {
					notEmpty: true,
					errorMessage: res.__("admin.email_actions.please_enter_options")
				},
			});

			/**parse Validation array  **/
			let errors = parseValidation(req.validationErrors(),req);

			/** Send error response **/
			if (errors)  return res.send({ status : STATUS_ERROR, message : errors});

			/** Update email actions data **/
			const email_actions = db.collection('email_actions');
			email_actions.updateOne({
				_id : ObjectId(id)
			},
			{$set:{
				action 	: (req.body.action)	 ? req.body.action	:"",
				options	: (req.body.options) ? req.body.options :"",
			}},(err,result)=>{
				if(err) return next(err);

				/** Send success response **/
				req.flash(STATUS_SUCCESS,res.__("admin.email_actions.email_actions_details_updated_successfully"));
				res.send({
					status		 : STATUS_SUCCESS,
					redirect_url : WEBSITE_ADMIN_URL+'email_actions',
					message		 : res.__("admin.email_actions.email_actions_details_updated_successfully"),
				});
			});
		}else{
			getEmailActionsDetails(req, res,next).then(response=>{
				if(response.status != STATUS_SUCCESS){
					/** Send error response **/
					req.flash(STATUS_ERROR,response.message);
					res.redirect(WEBSITE_ADMIN_URL+'email_actions');
					return;
				}

				/** Render edit page  **/
				req.breadcrumbs(BREADCRUMBS['admin/email_actions/edit']);
				res.render('edit',{
					result	: response.result,
				});
			}).catch(next);
		}
	};//End edit()

	/**
	 * Function for delete email actions
	 *
	* @param req 	As 	Request Data
	 * @param res 	As 	Response Data
	 * @param next 	As 	Callback argument to the middleware function
	 *
	 * @return null
	 */
	this.delete =(req, res,next)=>{
		let id = (req.params.id) ? req.params.id : '';

		/** Delete email actions*/
		const email_actions = db.collection('email_actions');
		email_actions.deleteOne({_id : ObjectId(id)},(err,result)=>{
			if(err) return next(err);

			/** Send success response **/
			req.flash(STATUS_SUCCESS,res.__("admin.email_actions.email_actions_deleted_successfully"));
			res.redirect(WEBSITE_ADMIN_URL+"email_actions");
		});
	};//End delete()
}
module.exports = new emailActions();



