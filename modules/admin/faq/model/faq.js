const asyncParallel	=	require('async/parallel');

function Faq() {

	/**
	 * Function to get  Faq list
	 *
	 * @param req 	As Request Data
	 * @param res 	As Response Data
	 *
	 * @return render/json
	 */
	this.getFaqList = (req,res)=>{
		if(isPost(req)){
			let limit			 =	(req.body.length) ? parseInt(req.body.length) :ADMIN_LISTING_LIMIT;
			let skip			 = 	(req.body.start)  ? parseInt(req.body.start)  :DEFAULT_SKIP;
			const collection	 = 	db.collection('faqs');
			/** Configure Datatable conditions*/
			configDatatable(req,res,null).then(dataTableConfig=>{
				dataTableConfig.conditions = Object.assign(dataTableConfig.conditions);

				asyncParallel({
					records :(callback)=>{
						/** Get list of  Pricing Package's **/ 
						collection.find(dataTableConfig.conditions,{projection: {_id:1,question:1,faq_ans:1,order:1,modified:1}}).collation(COLLATION_VALUE).sort(dataTableConfig.sort_conditions).limit(limit).skip(skip).toArray((err, result)=>{
							callback(err, result);
						}); 
					},
					total_records:(callback)=>{
						/** Get total number of records in  Faq collection **/
						collection.countDocuments({},(err,countResult)=>{
							callback(err, countResult);
						});
					},
					filter_records:(callback)=>{
						/** Get filtered records counting in  Faq **/
						collection.countDocuments(dataTableConfig.conditions,(err,filterContResult)=>{
							callback(err, filterContResult);
						});
					}
				},(err, response)=>{
					/** Send response **/
					res.send({
						status			: (!err) ? STATUS_SUCCESS : STATUS_ERROR,
						draw			: dataTableConfig.result_draw,
						data			: (response.records) ? response.records :[],
						recordsFiltered	: (response.filter_records) ? response.filter_records :0,
						recordsTotal	: (response.total_records) ? response.total_records :0
					});
				});
			});
		}else{
			/** render PricingPackage listing page **/
			req.breadcrumbs(BREADCRUMBS['admin/faqs/list']);
			res.render('list');
		}
	};//End getFaqList()

	/**
	 * Function to get  Faq detail
	 *
	 * @param req	As Request Data
	 * @param res	As Response Data
	 * @param next 	As Callback argument to the middleware function
	 *
	 * @return json
	 */
	let getFaqDetails = (req, res, next)=>{
		return new Promise(resolve=>{
			let FaqId =	(req.params.id)   ? req.params.id   :"";

			/** Get  Faq details **/
			const faqs = db.collection('faqs');
			faqs.findOne({
				_id  : ObjectId(FaqId),
			},
			{projection: {
				_id:1,question:1,faq_ans:1,order:1,faq_category:1,modified:1,user_type:1
			}},(err, result)=>{
				if(err) return next(err);
				/** Send error response */
				if(!result) return resolve({status : STATUS_ERROR, message	: res.__("admin.system.invalid_access") });

				/** Send success response **/
				resolve({
					status	: STATUS_SUCCESS,
					result	: result
				});
			});
		}).catch(next);
	};// End getFaqDetails()

	/**
	 * Function for add or update  Faq
	 *
	 * @param req 	As Request Data
	 * @param res 	As Response Data
	 * @param next 	As Callback argument to the middleware function
	 *
	 * @return render/json
	 */
	this.addEditFaq = async (req, res,next)=>{
		let isEditable	= (req.params.id) ?	true :false;

		if(isPost(req)){
			/** Sanitize Data **/
			req.body 				= 	sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);
			let FaqId				=	(req.params.id) 	? 	ObjectId(req.params.id)	:ObjectId();
			let order				= 	(req.body.order) 	? 	parseInt(req.body.order):"";

			/** Check validation **/
			req.checkBody({
				'question': {
					notEmpty: true,
					isLength:{
                        options: {
                        	min    : FAQ_QUESTION_MIN_LENGTH,
                    		max    : FAQ_QUESTION_MAX_LENGTH,
                        },
                        errorMessage: res.__("admin.faq.please_enter_question_min_max",FAQ_QUESTION_MIN_LENGTH,FAQ_QUESTION_MAX_LENGTH)
                    },
					errorMessage: res.__("admin.faq.please_enter_question")
				},
				'order': {
					notEmpty: true,
					errorMessage: res.__("admin.faq.please_enter_faq_order"),
					isInt: {
						errorMessage: res.__("admin.faq.please_only_numeric_order",1)
					}
				},
				'faq_ans': {
					notEmpty: true,
					isLength	:	{
						options		: {min:FAQ_ANS_MIN_LENGTH,max:FAQ_ANS_MAX_LENGTH},
						errorMessage: res.__("admin.faq.please_enter_faq_min_max",FAQ_ANS_MIN_LENGTH,FAQ_ANS_MAX_LENGTH)
					},
					errorMessage: res.__("admin.faq.please_enter_answer"),
				},
			});


			/** parse Validation array  **/
			let errors = parseValidation(req.validationErrors(),req);


			if(order <= 0){
				if(!errors) errors =[];
				errors.push({'param':'order','msg':res.__("admin.faq.please_only_numeric_order",1)});
			}
			/** Send error response **/
			if(errors) return res.send({status	: STATUS_ERROR, message	: errors});
			const faqs = db.collection('faqs');

			asyncParallel({
				slug: (callback)=>{
					if(isEditable) return callback(null,null);
					/** Set options for get  Faq slug **/
					let slugOptions = {
						title 		: req.body.title,
						table_name 	: "faqs",
						slug_field 	: "slug"
					};
					/** Get slug **/
					getDatabaseSlug(slugOptions).then(slugResponse=>{
						let slug 		= (slugResponse && slugResponse.title) ? slugResponse.title :"";
						callback(null,slug);
					}).catch(next);
				},
				order_check: (callback)=>{
					/** Set options for get  Faq slug **/
					let conditionOptions = {order         : order};
					if(isEditable){
						conditionOptions._id = {$ne :ObjectId(FaqId)}
					}
					 /** Configure user unique conditions **/
		            faqs.findOne(conditionOptions,{projection: {_id:1,order:1}},(err,result)=>{
		            	callback(null,result);
		            });
				}
			},(asyncErr, asyncResponse)=>{

				if(asyncErr) return res.send({status : STATUS_ERROR, message : res.__("system.something_going_wrong_please_try_again")});

				if(asyncResponse && asyncResponse.order_check != null ){
					return res.send({status	: STATUS_ERROR, message	: [{'param':'order','msg':res.__("admin.faq.order_exist")}]});
				}

				/** Save  Faq details **/
				faqs.updateOne({
					_id : FaqId
				},
				{
					$set : {
						question			:	(req.body.question) 	? req.body.question 				: '',
						faq_ans				: 	(req.body.faq_ans)  	? req.body.faq_ans 					: '',
						order 	 			:	(req.body.order)   		? parseInt(req.body.order)  		: 0,
						modified 			: 	getUtcDate()
					},
					$setOnInsert: {
						slug 		:   (asyncResponse.slug) ? asyncResponse.slug :"",
						created 	: 	getUtcDate(),
					}
				},{upsert: true},(err) => {
					if(err) return next(err);

					/** Send success response **/
					let message = (isEditable) ? res.__("admin.faq_management.faq_has_been_updated_successfully") :res.__("admin.faq.faq_has_been_added_successfully");
					req.flash(STATUS_SUCCESS,message);
					res.send({
						status		:	STATUS_SUCCESS,
						redirect_url:  	WEBSITE_ADMIN_URL+"faq",
						message		:	message,
					});
				});
			});
		}else{
			let result = {};
			if(isEditable){
				/** Get  Faq details **/
				response  =	await getFaqDetails(req, res, next);
				if(response.status != STATUS_SUCCESS){
					/** Send error response **/
					req.flash(STATUS_ERROR,response.message);
					return res.redirect(WEBSITE_ADMIN_URL+"faq");
				}
				result = response.result;
			}

			/** Render edit page  **/
			let breadcrumbs = (isEditable) ?  'admin/faqs/edit' :'admin/faqs/add';
			req.breadcrumbs(BREADCRUMBS[breadcrumbs]);
			res.render('add_edit',{
				result		       : result,
				is_editable	       : isEditable,
				dynamic_variable   : res.__('admin.faqs.pricing_package'),
			});
		}
	};//End addEditFaq()

	/**
	 * Function for delete Faq
	 *
	 * @param req 	As Request Data
	 * @param res 	As Response Data
	 * @param next 	As Callback argument to the middleware function
	 *
	 * @return render/json
	 */
	this.FaqDelete = (req, res, next)=>{
		let FaqId = 	(req.params.id)	? req.params.id	:"";
		/** Remove  Faq record **/
		const faqs = db.collection('faqs');
		faqs.deleteOne({_id : ObjectId(FaqId)},(err)=>{
			if(err) return next(err);
			/** Send success response **/
			req.flash(STATUS_SUCCESS,res.__("admin.faqs.faqs_deleted_successfully"));
			res.redirect(WEBSITE_ADMIN_URL+"faq");
		});
	};//End FaqDelete()
}
module.exports = new  Faq();
