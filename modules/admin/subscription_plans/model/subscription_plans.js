const asyncParallel	= require("async/parallel");
const clone			= require("clone");
const { ObjectId }  = require("mongodb");

function SubscriptionPlans() {

	/**
	 * Function to get plan list
	 *
	 * @param req As Request Data
	 * @param res As Response Data
	 *
	 * @return render/json
	 */
	this.getPlanList = (req, res,next)=>{
		if(isPost(req)){
			let limit			= (req.body.length) ? parseInt(req.body.length)	: ADMIN_LISTING_LIMIT;
			let skip			= (req.body.start)	? parseInt(req.body.start)	: DEFAULT_SKIP;
			const collection	= db.collection('subscription_plans');

			/** Configure Datatable conditions*/
			configDatatable(req,res,null).then(dataTableConfig=>{
				asyncParallel([
					(callback)=>{
						/** Get list of plans **/
						collection.find(dataTableConfig.conditions,{projection: {_id:1,title:1,price : 1, description:1,modified:1,is_active:1,is_recommend:1}}).collation(COLLATION_VALUE).sort(dataTableConfig.sort_conditions).limit(limit).skip(skip).toArray((err,result)=>{
							callback(err, result);
						});
					},
					(callback)=>{
						/** Get total number of records in subscription plans collection **/
						collection.countDocuments({},(err,countResult)=>{
							callback(err, countResult);
						});
					},
					(callback)=>{
						/** Get filtered records counting in pages **/
						collection.countDocuments(dataTableConfig.conditions,(err,filterContResult)=>{
							callback(err, filterContResult);
						});
					}
				],
				(err, response)=>{
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
			req.breadcrumbs(BREADCRUMBS['admin/subscription_plans/list']);
			res.render('list');
		}
	};//End getPlanList()

	/**
	 * Function to get plan's detail
	 *
	 * @param req	As	Request Data
	 * @param res	As	Response Data
	 * @param next	As 	Callback argument to the middleware function
	 *
	 * @return json
	 */
	let getPlanDetails = (req,res,next)=>{
		return new Promise(resolve=>{
			let planId = (req.params.id) ? req.params.id : "";
			/** Get plan details **/
			const collection = db.collection('subscription_plans');
			collection.findOne({
					_id : ObjectId(planId)
				},
				{projection: {
					_id:1,price:1,is_active:1,level:1,
					title:1,description:1,modified:1,plan_descriptions:1,created:1
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
	};// End getPlanDetails().

	/**
	 * Function to update plan's detail
	 *
	 * @param req 	As 	Request Data
	 * @param res 	As 	Response Data
	 * @param next 	As 	Callback argument to the middleware function
	 *
	 * @return render/json
	 */
	this.editPlan = (req, res,next)=>{
		if(isPost(req)){
			/** Sanitize Data **/
			req.body	= sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);
			let id		= (req.params.id) ? req.params.id :"";

			if(req.body.plan_descriptions === undefined || req.body.plan_descriptions[DEFAULT_LANGUAGE_MONGO_ID] === undefined || req.body.plan_descriptions[DEFAULT_LANGUAGE_MONGO_ID] == ''){
				/** Send error response */
				return res.send({
					status	: STATUS_ERROR,
					message	: [{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again")}]
				});
			}

			let languageData		=	clone(req.body.plan_descriptions[DEFAULT_LANGUAGE_MONGO_ID]);
			req.body.title			= 	(languageData.title) ? 	languageData.title 	:"";
			req.body.description	= 	(languageData.description) ? languageData.description 	:"";

			/** Check validation */
			req.checkBody({
				'level': {
					notEmpty: true,
					errorMessage: res.__("admin.subscription_plan.please_select_level")
				},
				'title': {
					notEmpty: true,
					errorMessage: res.__("admin.subscription_plan.please_enter_title")
				},
				'description': {
					notEmpty: true,
					errorMessage: res.__("admin.subscription_plan.please_enter_description")
				},
				'price': {
					notEmpty: true,
					errorMessage: res.__("admin.subscription_plan.please_enter_price"),
					isFloat	:{
						options    : {min : 0 , max : 1000000},
						errorMessage:res.__("front.user.please_enter_a_valid_price")
					},
				}
			});


			let price			= 	(req.body.price)			?	req.body.price	:"";
			let title			= 	(req.body.title)			?	req.body.title	:"";
			let level			= 	(req.body.level)			?	req.body.level	:{};
			let description		= 	(req.body.description)		?	req.body.description	:"";
			let planDescription = 	(req.body.plan_descriptions)?	req.body.plan_descriptions :{};

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

			let levelId 	= level ? level.split(",")[0] : "";
			let levelName 	= level ? level.split(",")[1] : "";

			/** Update plan details **/
			const collection = db.collection("subscription_plans");
			collection.updateOne({
					_id : ObjectId(id)
				},
				{$set: {
					price				:	price,
					title				:	title,
					level               :   {_id : ObjectId(levelId), name : levelName},
					description			: 	description,
					plan_descriptions	: 	planDescription,
					modified 			:	getUtcDate()
				}},(err,result)=>{
					if(err) return next(err);

					/** Send success response **/
					req.flash(STATUS_SUCCESS,res.__("admin.subscription_plans.plan_details_has_been_updated_successfully"));
					res.send({
						status			: STATUS_SUCCESS,
						redirect_url	: WEBSITE_ADMIN_URL+'subscription_plans',
						message			: res.__("admin.subscription_plans.plan_details_has_been_updated_successfully"),
					});
				}
			);
		}else{
			/** Get language list **/
			getLanguages().then(languageList=>{
				/** Get plan details **/
				getPlanDetails(req,res,next).then(response=>{
					if(response.status != STATUS_SUCCESS){
						/** Send error response **/
						req.flash(STATUS_ERROR,response.message);
						res.redirect(WEBSITE_ADMIN_URL+'subscription_plans');
						return;
					}

					let levelId = (response.result && response.result['level']) ? response.result['level']['_id'] : ObjectId();
					let options = {
						collections:[
							{
								collection : 'masters',
								selected   : [levelId],
								conditions : {
									dropdown_type : "level", 
									status : ACTIVE
								},
								columns : ['_id','name']
							}
						]
					};
					getDropdownList(req,res,next,options).then(dropdownList=>{
						/** Render edit page **/
						req.breadcrumbs(BREADCRUMBS['admin/subscription_plans/edit']);
						res.render('edit',{
							result			: 	response.result,
							language_list	:	languageList,
							level_list 		: 	dropdownList.final_html_data['0'],
							subject_list 	: 	dropdownList.final_html_data['1'],
						});
					}).catch(next);
				}).catch(next);
			}).catch(next);
		}
	};//End editPlan()

	/**
	 * Function for add plan
	 *
	 * @param req 	As	Request Data
	 * @param res 	As	Response Data
	 * @param next 	As 	Callback argument to the middleware function
	 *
	 * @return render/json
	 */
	this.addPlan = (req, res,next)=>{
		if(isPost(req)){
			/** Sanitize Data */
			req.body = 	sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);
			if(req.body.plan_descriptions === undefined || req.body.plan_descriptions[DEFAULT_LANGUAGE_MONGO_ID] === undefined || req.body.plan_descriptions[DEFAULT_LANGUAGE_MONGO_ID] == ''){
				/** Send error response */
				return res.send({
					status	: STATUS_ERROR,
					message	: [{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again")}]
				});
			}

			let languageData		=	clone(req.body.plan_descriptions[DEFAULT_LANGUAGE_MONGO_ID]);
			req.body.title			= 	(languageData.title) ? 	languageData.title 	:"";
			req.body.description	= 	(languageData.description) ? languageData.description 	:"";

			/** Check validation */
			req.checkBody({
				'level': {
					notEmpty: true,
					errorMessage: res.__("admin.subscription_plan.please_select_level")
				},
				'title': {
					notEmpty: true,
					errorMessage: res.__("admin.subscription_plan.please_enter_title")
				},
				'description': {
					notEmpty: true,
					errorMessage: res.__("admin.subscription_plan.please_enter_description")
				},
				'price': {
					notEmpty: true,
					errorMessage: res.__("admin.subscription_plan.please_enter_price"),
					isFloat	:{
						options    : {min : 0 , max : 1000000},
						errorMessage:res.__("front.user.please_enter_a_valid_price")
					},
				}
			});


			let price			= 	(req.body.price)			?	req.body.price	:"";
			let level			= 	(req.body.level)			?	req.body.level	:{};
			let title			= 	(req.body.title)			?	req.body.title	:"";
			let description		= 	(req.body.description)		?	req.body.description	:"";
			let planDescription = 	(req.body.plan_descriptions)?	req.body.plan_descriptions :{};

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

			/** Set options **/
			let options = {
				title 		:	title,
				table_name 	: 	"subscription_plans",
				slug_field 	: 	"slug"
			};

			/** Make Slug */
			getDatabaseSlug(options).then(response=>{
				let slug = (response && response.title)	?	response.title	:"";
				
				let levelId 	= level ? level.split(",")[0] : "";
				let levelName 	= level ? level.split(",")[1] : "";

				/** Save plan details */
				const collection = db.collection('subscription_plans');
				collection.insertOne({
					slug				: 	slug,
					price				:	price,
					title				:	title,
					level               :   {_id : ObjectId(levelId), name : levelName},
					description			: 	description,
					default_language_id	: 	DEFAULT_LANGUAGE_MONGO_ID,
					plan_descriptions	: 	planDescription,
					is_active           :   ACTIVE,
					created 			: 	getUtcDate(),
					modified 			: 	getUtcDate()
				},(err,result)=>{
					if(err) return next(err);

					/** Send success response */
					req.flash(STATUS_SUCCESS,res.__("admin.subscription_plan.plan_has_been_added_successfully"));
					res.send({
						status			: STATUS_SUCCESS,
						redirect_url	: WEBSITE_ADMIN_URL+'subscription_plans',
						message			: res.__("admin.subscription_plan.plan_has_been_added_successfully")
					});
				});
			},error=>{
				/** Send error response */
				res.send({
					status	: STATUS_ERROR,
					message	: [{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again")}]
				});
			});
		}else{
			let options = {
				collections:[
					{
						collection : 'masters',
						selected   : [],
						conditions : {
							dropdown_type : "level", 
							status : ACTIVE
						},
						columns : ['_id','name']
					}
				]
			};
			getDropdownList(req,res,next,options).then(dropdownList=>{
				/** Get language list */
				getLanguages().then(languageList=>{
					req.breadcrumbs(BREADCRUMBS['admin/units/add']);

					/**Render add page */
					res.render('add',{
						language_list	: languageList,
						level_list 		: (dropdownList.final_html_data['0']) ? dropdownList.final_html_data['0'] : ''
					});
				}).catch(next);
			}).catch(next);
		}
	};//End addPlan()


	/**
	 * Function for view plan
	 *
	 * @param req 	As	Request Data
	 * @param res 	As	Response Data
	 * @param next 	As 	Callback argument to the middleware function
	 *
	 * @return render/json
	 */
	this.viewPlan = (req, res,next)=>{
		/** Get language list **/
		getLanguages().then(languageList=>{
			/** Get plan details **/
			getPlanDetails(req,res,next).then(response=>{
				if(response.status != STATUS_SUCCESS){
					/** Send error response **/
					req.flash(STATUS_ERROR,response.message);
					res.redirect(WEBSITE_ADMIN_URL+'subscription_plans');
					return;
				}

				/** Render edit page **/
				req.breadcrumbs(BREADCRUMBS['admin/subscription_plans/view']);
				res.render('view',{
					result			: 	response.result,
					language_list	:	languageList
				});
			}).catch(next);
		}).catch(next);
	}// End viewPlan

	/**
     * Function for update plan's status
     *
     * @param req   As Request Data
     * @param res   As Response Data
     * @param next  As  Callback argument to the middleware function
     *
     * @return null
     */
	this.updatePlanStatus = (req,res,next)=>{
		let planId  = (req.params.id)  ? req.params.id  : "";

		/** Update user status*/
		const subscriptionPlans = db.collection("subscription_plans");
		subscriptionPlans.updateMany({},{$set :{modified  : getUtcDate(), is_recommend : DEACTIVE}},(err,results)=>{
			if(err) return next(err);

			subscriptionPlans.updateOne({_id : ObjectId(planId)},{$set :{modified  : getUtcDate(), is_recommend : ACTIVE}},(error,result)=>{
				if(error) return next(error);

				/** Send success response **/
				req.flash(STATUS_SUCCESS,res.__("admin.subscription_plans.plan_status_has_been_updated_successfully"));
				res.redirect(WEBSITE_ADMIN_URL+"subscription_plans/");
			});
		});
	};//End updatePlanStatus()
}
module.exports = new SubscriptionPlans();
