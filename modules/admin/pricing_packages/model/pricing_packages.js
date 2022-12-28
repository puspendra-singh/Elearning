const asyncParallel	=	require('async/parallel');

function PricingPackages() {

	/**
	 * Function to get  Pricing Packages list
	 *
	 * @param req 	As Request Data
	 * @param res 	As Response Data
	 *
	 * @return render/json
	 */
	this.getPricingPackagesList = (req,res)=>{
		let type = req.params.type;
		if(isPost(req)){
			let limit			 =	(req.body.length) ? parseInt(req.body.length) :ADMIN_LISTING_LIMIT;
			let skip			 = 	(req.body.start)  ? parseInt(req.body.start)  :DEFAULT_SKIP;
			const collection	 = 	db.collection('pricing_packages');

			/**Set variable for conditions */
			let commonConditions = {
				type : type
			};

			/** Configure Datatable conditions*/
			configDatatable(req,res,null).then(dataTableConfig=>{
				dataTableConfig.conditions = Object.assign(dataTableConfig.conditions,commonConditions);

				asyncParallel({
					records :(callback)=>{
						/** Get list of  Pricing Package's **/
						collection.find(dataTableConfig.conditions,{projection: {_id:1,title:1,amount:1,products:1,days:1,modified:1}}).collation(COLLATION_VALUE).sort(dataTableConfig.sort_conditions).limit(limit).skip(skip).toArray((err, result)=>{
							callback(err, result);
						});
					},
					total_records:(callback)=>{
						/** Get total number of records in  Pricing Packages collection **/
						collection.countDocuments(commonConditions,(err,countResult)=>{
							callback(err, countResult);
						});
					},
					filter_records:(callback)=>{
						/** Get filtered records counting in  Pricing Packages **/
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
			req.breadcrumbs(BREADCRUMBS['admin/pricing_packages/list']);
			res.render('list',{
				type_name : type
			});
		}
	};//End getPricingPackagesList()

	/**
	 * Function to get  Pricing Packages detail
	 *
	 * @param req	As Request Data
	 * @param res	As Response Data
	 * @param next 	As Callback argument to the middleware function
	 *
	 * @return json
	 */
	let getPricingPackagesDetails = (req, res, next)=>{
		return new Promise(resolve=>{
			let pricingPackagesId =	(req.params.id)   ? req.params.id   :"";

			/** Get  Pricing Packages details **/
			const pricing_packages = db.collection('pricing_packages');
			pricing_packages.findOne({
				_id  : ObjectId(pricingPackagesId),
			},
			{projection: {
				_id:1,title:1,amount:1,products:1,days:1,modified:1,
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
	};// End getPricingPackagesDetails()

	/**
	 * Function for add or update  Pricing Packages
	 *
	 * @param req 	As Request Data
	 * @param res 	As Response Data
	 * @param next 	As Callback argument to the middleware function
	 *
	 * @return render/json
	 */
	this.addEditPricingPackages = async (req, res,next)=>{
		let type 		= req.params.type;
		let isEditable	= (req.params.id) ?	true :false;

		if(isPost(req)){
			/** Sanitize Data **/
			req.body 				= 	sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);
			let pricingPackagesId	=	(req.params.id) 	? 	ObjectId(req.params.id)	:ObjectId();

			/** Check validation **/
			req.checkBody({
				'title': {
					notEmpty: true,
					errorMessage: res.__("admin.pricing_packages.please_enter_title")
				},
				'products': {
					notEmpty: true,
					errorMessage: res.__("admin.pricing_packages.please_enter_products"),
					isInt: {
						errorMessage: res.__("admin.pricing_packages.please_enter_valid_products")
					}
				},
			});

			if(req.body.days && req.body.days != ""){
				req.checkBody({
					'days': {
						isInt: {
							errorMessage: res.__("admin.pricing_packages.please_enter_valid_days")
						}
					}
				});
			}
			if(req.body.amount && req.body.amount != ""){
				req.checkBody({
					'amount': {
						isFloat: {
							errorMessage: res.__("admin.pricing_packages.please_enter_valid_amount")
						}
					}
				});
			}

			/** parse Validation array  **/
			let errors = parseValidation(req.validationErrors(),req);

			/** Send error response **/
			if(errors) return res.send({status	: STATUS_ERROR, message	: errors});

			asyncParallel({
				slug: (callback)=>{
					if(isEditable) return callback(null,null);
					/** Set options for get  pricing packages slug **/
					let slugOptions = {
						title 		: req.body.title,
						table_name 	: "pricing_packages",
						slug_field 	: "slug"
					};
					/** Get slug **/
					getDatabaseSlug(slugOptions).then(slugResponse=>{
						let slug 		= (slugResponse && slugResponse.title) ? slugResponse.title :"";
						callback(null,slug);
					}).catch(next);
				}
			},(asyncErr, asyncResponse)=>{

				if(asyncErr) return res.send({status : STATUS_ERROR, message : res.__("system.something_going_wrong_please_try_again")});

				/** Save  Pricing Packages details **/
				const pricing_packages = db.collection('pricing_packages');
				pricing_packages.updateOne({
					_id : pricingPackagesId
				},
				{
					$set : {
						title		:	req.body.title,
						amount 	 	:	(req.body.amount)   ? parseFloat(round(req.body.amount)) : 0,
						products	: 	(req.body.products) ? parseInt(req.body.products) : 0,
						days		: 	(req.body.days) 	? parseInt(req.body.days) : 0,
						modified 	: 	getUtcDate()
					},
					$setOnInsert: {
						type		:   type,
						slug 		:   (asyncResponse.slug) ? asyncResponse.slug :"",
						created 	: 	getUtcDate(),
					}
				},{upsert: true},(err) => {
					if(err) return next(err);

					/** Send success response **/
					let message = (isEditable) ? res.__("admin.pricing_packages.pricing_packages_has_been_updated_successfully") :res.__("admin.pricing_packages.pricing_packages_has_been_added_successfully");
					req.flash(STATUS_SUCCESS,message);
					res.send({
						status		:	STATUS_SUCCESS,
						redirect_url:  	WEBSITE_ADMIN_URL+"pricing_packages/"+type,
						message		:	message,
					});
				});
			});
		}else{
			let result = {};
			if(isEditable){
				/** Get  Pricing Packages details **/
				response  =	await getPricingPackagesDetails(req, res, next);
				if(response.status != STATUS_SUCCESS){
					/** Send error response **/
					req.flash(STATUS_ERROR,response.message);
					return res.redirect(WEBSITE_ADMIN_URL+"pricing_packages/"+type);
				}
				result = response.result;
			}

			/** Render edit page  **/
			let breadcrumbs = (isEditable) ?  'admin/pricing_packages/edit' :'admin/pricing_packages/add';
			req.breadcrumbs(BREADCRUMBS[breadcrumbs]);
			res.render('add_edit',{
				result		       : result,
				is_editable	       : isEditable,
				type_name		   : type,
				dynamic_variable   : res.__('admin.pricing_packages.pricing_package'),
				dynamic_url		   : type,
			});
		}
	};//End addEditPricingPackages()

	/**
	 * Function for delete Pricing Packages
	 *
	 * @param req 	As Request Data
	 * @param res 	As Response Data
	 * @param next 	As Callback argument to the middleware function
	 *
	 * @return render/json
	 */
	this.pricingPackagesDelete = (req, res, next)=>{
		let type = req.params.type;
		let pricingPackagesId = 	(req.params.id)	? req.params.id	:"";
		/** Remove  Pricing Packages record **/
		const pricing_packages = db.collection('pricing_packages');
		pricing_packages.deleteOne({_id : ObjectId(pricingPackagesId)},(err)=>{
			if(err) return next(err);
			/** Send success response **/
			req.flash(STATUS_SUCCESS,res.__("admin.pricing_packages.pricing_packages_deleted_successfully"));
			res.redirect(WEBSITE_ADMIN_URL+"pricing_packages/"+type);
		});
	};//End pricingPackagesDelete()
}
module.exports = new  PricingPackages();
