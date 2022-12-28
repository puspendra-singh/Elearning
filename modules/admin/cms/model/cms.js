const asyncParallel	= require("async/parallel");
const clone			= require("clone");

function Cms() {

	/**
	 * Function to get cms list
	 *
	 * @param req As Request Data
	 * @param res As Response Data
	 *
	 * @return render/json
	 */
	this.getCmsList = (req, res,next)=>{
		if(isPost(req)){
			let limit			= (req.body.length) ? parseInt(req.body.length)	: ADMIN_LISTING_LIMIT;
			let skip			= (req.body.start)	? parseInt(req.body.start)	: DEFAULT_SKIP;
			const collection	= db.collection('pages');

			/** Configure Datatable conditions*/
			configDatatable(req,res,null).then(dataTableConfig=>{
				asyncParallel([
					(callback)=>{
						/** Get list of cms **/
						collection.find(dataTableConfig.conditions,{projection: {_id:1,name:1,body:1,modified:1,is_active:1}}).collation(COLLATION_VALUE).sort(dataTableConfig.sort_conditions).limit(limit).skip(skip).toArray((err,result)=>{
							callback(err, result);
						});
					},
					(callback)=>{
						/** Get total number of records in pages collection **/
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
			req.breadcrumbs(BREADCRUMBS['admin/cms/list']);
			res.render('list');
		}
	};//End getCmsList()

	/**
	 * Function to get cms's detail
	 *
	 * @param req	As	Request Data
	 * @param res	As	Response Data
	 * @param next	As 	Callback argument to the middleware function
	 *
	 * @return json
	 */
	let getCmsDetails = (req,res,next)=>{
		return new Promise(resolve=>{
			let cmsId = (req.params.id) ? req.params.id : "";
			/** Get Cms details **/
			const pages = db.collection('pages');
			pages.findOne({
					_id : ObjectId(cmsId)
				},
				{projection: {
					_id:1,name:1,body:1,modified:1,pages_descriptions:1
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
	};// End getCmsDetails().

	/**
	 * Function to update cms's detail
	 *
	 * @param req 	As 	Request Data
	 * @param res 	As 	Response Data
	 * @param next 	As 	Callback argument to the middleware function
	 *
	 * @return render/json
	 */
	this.editCms = (req, res,next)=>{
		if(isPost(req)){
			/** Sanitize Data **/
			req.body	= sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);
			let id		= (req.params.id) ? req.params.id :"";

			if(id == "" || typeof req.body.pages_descriptions === typeof undefined || (typeof req.body.pages_descriptions[DEFAULT_LANGUAGE_MONGO_ID] === typeof undefined || !req.body.pages_descriptions[DEFAULT_LANGUAGE_MONGO_ID] || req.body.pages_descriptions[DEFAULT_LANGUAGE_MONGO_ID] == '')){
				/** Send error response **/
				return res.send({
					status	: STATUS_ERROR,
					message	: [{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again")}]
				});
			}

			let allData		= req.body;
			req.body		= clone(allData.pages_descriptions[DEFAULT_LANGUAGE_MONGO_ID]);
			let pageBody	= (req.body.body)	? req.body.body	: "";

			/** Check validation **/
			req.checkBody({
				'name': {
					notEmpty: true,
					errorMessage: res.__("admin.cms.please_enter_page_name")
				},
				'body': {
					notEmpty: true,
					errorMessage: res.__("admin.cms.please_enter_page_description")
				},
			});

			if(pageBody!= ""){
				req.body.body =  pageBody.replace(new RegExp(/&nbsp;|<br \/\>|<p>|<\/p>/g),' ').trim();
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

			/** Update cms details **/
			const pages = db.collection("pages");
			pages.updateOne({
					_id : ObjectId(id)
				},
				{$set: {
					body				: 	pageBody,
					name				: 	(req.body.name)	?	req.body.name	:"",
					default_language_id	: 	DEFAULT_LANGUAGE_MONGO_ID,
					pages_descriptions	: 	(allData.pages_descriptions) ? allData.pages_descriptions :{},
					modified 			:	getUtcDate()
				}},(err,result)=>{
					if(err) return next(err);

					/** Send success response **/
					req.flash(STATUS_SUCCESS,res.__("admin.cms.cms_details_has_been_updated_successfully"));
					res.send({
						status			: STATUS_SUCCESS,
						redirect_url	: WEBSITE_ADMIN_URL+'cms',
						message			: res.__("admin.cms.cms_details_has_been_updated_successfully"),
					});
				}
			);
		}else{
			/** Get language list **/
			getLanguages().then(languageList=>{
				/** Get cms details **/
				getCmsDetails(req,res,next).then(response=>{
					if(response.status != STATUS_SUCCESS){
						/** Send error response **/
						req.flash(STATUS_ERROR,response.message);
						res.redirect(WEBSITE_ADMIN_URL+'cms');
						return;
					}

					/** Render edit page **/
					req.breadcrumbs(BREADCRUMBS['admin/cms/edit']);
					res.render('edit',{
						result			: 	response.result,
						language_list	:	languageList
					});
				}).catch(next);
			}).catch(next);
		}
	};//End editCms()

	/**
	 * Function for add cms
	 *
	 * @param req 	As	Request Data
	 * @param res 	As	Response Data
	 * @param next 	As 	Callback argument to the middleware function
	 *
	 * @return render/json
	 */
	this.addCms = (req, res,next)=>{
		if(isPost(req)){
			/** Sanitize Data */
			req.body = 	sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);
			console.log(req.body, "req.body");
			if(req.body.pages_descriptions === undefined || req.body.pages_descriptions[DEFAULT_LANGUAGE_MONGO_ID] === undefined || req.body.pages_descriptions[DEFAULT_LANGUAGE_MONGO_ID] == ''){
				/** Send error response */
				return res.send({
					status	: STATUS_ERROR,
					message	: [{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again")}]
				});
			}

			let allData		= 	req.body;
			req.body		=	clone(allData.pages_descriptions[DEFAULT_LANGUAGE_MONGO_ID]);
			let pageBody	= 	(req.body.body)	?	req.body.body	:"";
			let pageName	= 	(req.body.name) ? 	req.body.name 	:"";

			/** Check validation */
			req.checkBody({
				'name': {
					notEmpty: true,
					errorMessage: res.__("admin.cms.please_enter_page_name")
				},
				'body': {
					notEmpty: true,
					errorMessage: res.__("admin.cms.please_enter_page_description")
				},
			})

			if(pageBody!= ""){
				req.body.body =  pageBody.replace(new RegExp(/&nbsp;|<br \/\>|<p>|<\/p>/g),' ').trim();
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
				title 		:	pageName,
				table_name 	: 	"pages",
				slug_field 	: 	"slug"
			};

			/** Make Slug */
			getDatabaseSlug(options).then(response=>{
				/** Save Cms details */
				const pages = db.collection('pages');
				pages.insertOne({
					name				:	pageName,
					body				: 	pageBody,
					slug				: 	(response && response.title)	?	response.title	:"",
					default_language_id	: 	DEFAULT_LANGUAGE_MONGO_ID,
					pages_descriptions	: 	(allData.pages_descriptions)	?	allData.pages_descriptions :{},
					created 			: 	getUtcDate(),
					modified 			: 	getUtcDate()
				},(err,result)=>{
					if(err) return next(err);

					/** Send success response */
					req.flash(STATUS_SUCCESS,res.__("admin.cms.cms_has_been_added_successfully"));
					res.send({
						status			: STATUS_SUCCESS,
						redirect_url	: WEBSITE_ADMIN_URL+'cms',
						message			: res.__("admin.cms.cms_has_been_added_successfully")
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
			/** Get language list */
			getLanguages().then(languageList=>{
				req.breadcrumbs(BREADCRUMBS['admin/cms/add']);
				/**Render add cms page */
				res.render('add',{
					language_list	: languageList
				});
			}).catch(next);
		}
	};//End addCms()
}
module.exports = new Cms();
