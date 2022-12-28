const asyncParallel	= require("async/parallel");
const clone			= require("clone");

function OtherResource() {

	/**
	 * Function to get Slider list
	 *
	 * @param req As Request Data
	 * @param res As Response Data
	 *
	 * @return render/json
	 */
	this.getOtherResourceList = (req, res,next)=>{
		if(isPost(req)){
			let limit			= (req.body.length) ? parseInt(req.body.length)	: ADMIN_LISTING_LIMIT;
			let skip			= (req.body.start)	? parseInt(req.body.start)	: DEFAULT_SKIP;
			const collection	= db.collection('other_resources');

			/** Configure Datatable conditions*/
			configDatatable(req,res,null).then(dataTableConfig=>{
				asyncParallel([
					(callback)=>{
						/** Get list **/
						collection.find(dataTableConfig.conditions,{projection: {_id:1,title:1,document:1,modified:1,status:1}}).collation(COLLATION_VALUE).sort(dataTableConfig.sort_conditions).limit(limit).skip(skip).toArray((err,result)=>{
							callback(err, result);
						});
					},
					(callback)=>{
						/** Get total number of records in collection **/
						collection.countDocuments({},(err,countResult)=>{
							callback(err, countResult);
						});
					},
					(callback)=>{
						/** Get filtered records counting in collection **/
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
			req.breadcrumbs(BREADCRUMBS['admin/other_resources/list']);
			res.render('list');
		}
	};//End getOtherResourceList()

	/**
	 * Function to get detail
	 *
	 * @param req	As	Request Data
	 * @param res	As	Response Data
	 * @param next	As 	Callback argument to the middleware function
	 *
	 * @return json
	 */
	let getOtherResourcesDetails = (req,res,next)=>{
		return new Promise(resolve=>{
			let otherResourceId = (req.params.id) ? req.params.id : "";

			/** Get other resources details **/
			let collection = db.collection('other_resources');
			collection.findOne({
					_id : ObjectId(otherResourceId)
				},
				{projection: {
					_id:1,title:1,modified:1,document:1,status:1
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

					/** Set options for append image full path **/
	                let options = {
	                    "file_url"          :   OTHER_RESOURCES_URL,
	                    "file_path"         :   OTHER_RESOURCES_FILE_PATH,
	                    "result"            :   [result],
	                    "database_field"    :   "document"
	                };

	                /** Append image with full path **/
	                appendFileExistData(options).then(fileResponse=>{
	                    let response = {
	                        status  : STATUS_SUCCESS,
	                        result  : (fileResponse && fileResponse.result && fileResponse.result[0])   ?   fileResponse.result[0]  :{}
	                    };
	                    resolve(response);
	                });
				}
			);
		});
	};// End getSliderDetails().

	/**
	 * Function to update Slider's detail
	 *
	 * @param req 	As 	Request Data
	 * @param res 	As 	Response Data
	 * @param next 	As 	Callback argument to the middleware function
	 *
	 * @return render/json
	 */
	this.editOtherResource = async(req, res,next)=>{
		if(isPost(req)){
			/** Sanitize Data **/
			req.body	= sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);
			let id		= (req.params.id) ? req.params.id :"";
			req.body.other_resources_descriptions = (req.body.other_resources_descriptions) ? JSON.parse(req.body.other_resources_descriptions) : '';
			
			if(req.body.other_resources_descriptions === undefined || req.body.other_resources_descriptions[DEFAULT_LANGUAGE_MONGO_ID] === undefined || req.body.other_resources_descriptions[DEFAULT_LANGUAGE_MONGO_ID] == ''){
				/** Send error response */
				return res.send({
					status	: STATUS_ERROR,
					message	: [{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again")}]
				});
			}


			let languageData		=	clone(req.body.other_resources_descriptions[DEFAULT_LANGUAGE_MONGO_ID]);
			req.body.title			= 	(languageData.title) ? 	languageData.title 	:"";
			
			/** Check validation **/
			req.checkBody({
				'title': {
					notEmpty: true,
					isLength:{
                        options: {
                        	min    : TITLE_MIN_LENGTH,
                    		max    : TITLE_MAX_LENGTH,
                        },
                        errorMessage: res.__("admin.other_resources.please_enter_slider_name_min",TITLE_MIN_LENGTH,TITLE_MAX_LENGTH)
                    },
					errorMessage: res.__("admin.other_resources.please_enter_title")
				}
			});


			let title	= 	(req.body.title) ? 	req.body.title :"";

			/** parse Validation array  **/
			let errors = parseValidation(req.validationErrors(),req);
			if (errors) return res.send({status	: STATUS_ERROR,message	: errors});
			
		 	/** Set options for upload image **/
            let image   =   (req.files && req.files.document)  ?   req.files.document :"";
            let imgaeOptions =   {
                'image'     :   image,
                'filePath'  :   OTHER_RESOURCES_FILE_PATH,
            };

			let updateData = {
				title : title,
				modified 	:	getUtcDate()
			}

			if(image) {
				let imgaeResponse = await moveUploadedFile(req, res,imgaeOptions);
				if(imgaeResponse.status == STATUS_ERROR){
					/** Send error response **/
					return res.send({
						status  : STATUS_ERROR,
						message : [{'param':'document','msg':imgaeResponse.message}],
					});
				}
				updateData['document'] = imgaeResponse.fileName   ?   imgaeResponse.fileName   :""
			}
			


			/** Update other resources details **/
			let otherResources = db.collection("other_resources");
			otherResources.updateOne({_id : ObjectId(id)},{$set: updateData},(err,result)=>{
					if(err) return next(err);

					/** Send success response **/
					req.flash(STATUS_SUCCESS,res.__("admin.other_resources.document_has_been_uploaded_successfully"));
					res.send({
						status			: STATUS_SUCCESS,
						redirect_url	: WEBSITE_ADMIN_URL+'other_resources',
						message			: res.__("admin.other_resources.document_has_been_uploaded_successfully"),
					});
				}
			);
		}else{
			/** Get language list **/
			getLanguages().then(languageList=>{
				/** Get details **/
				getOtherResourcesDetails(req,res,next).then(response=>{
					if(response.status != STATUS_SUCCESS){
						/** Send error response **/
						req.flash(STATUS_ERROR,response.message);
						res.redirect(WEBSITE_ADMIN_URL+'slider');
						return;
					}

					/** Render edit page **/
					req.breadcrumbs(BREADCRUMBS['admin/other_resources/edit']);
					res.render('edit',{
						result			: 	response.result,
						language_list	:	languageList
					});
				}).catch(next);
			}).catch(next);
		}
	};//End editOtherResource()

	/**
	 * Function for add Slider
	 *
	 * @param req 	As	Request Data
	 * @param res 	As	Response Data
	 * @param next 	As 	Callback argument to the middleware function
	 *
	 * @return render/json
	 */
	this.addOtherResource = (req, res,next)=>{

		if(isPost(req)){

			/** Sanitize Data */
			req.body = 	sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);
			req.body.other_resources_descriptions = (req.body.other_resources_descriptions) ? JSON.parse(req.body.other_resources_descriptions) : '';

			if(req.body.other_resources_descriptions === undefined || req.body.other_resources_descriptions[DEFAULT_LANGUAGE_MONGO_ID] === undefined || req.body.other_resources_descriptions[DEFAULT_LANGUAGE_MONGO_ID] == ''){
				/** Send error response */
				return res.send({
					status	: STATUS_ERROR,
					message	: [{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again")}]
				});
			}


			let languageData		=	clone(req.body.other_resources_descriptions[DEFAULT_LANGUAGE_MONGO_ID]);
			req.body.title			= 	(languageData.title) ? 	languageData.title 	:"";

			/** Check validation */
			req.checkBody({
				'title': {
					notEmpty: true,
					isLength:{
                        options: {
                        	min    : TITLE_MIN_LENGTH,
                    		max    : TITLE_MAX_LENGTH,
                        },
                        errorMessage: res.__("admin.other_resources.please_enter_title_min",TITLE_MIN_LENGTH,TITLE_MAX_LENGTH)
                    },
					errorMessage: res.__("admin.other_resources.please_enter_title")
				}
			})
		
			let title		= 	(req.body.title) 		? 	req.body.title :"";

			/** parse Validation array  */
			let errors = parseValidation(req.validationErrors(),req);
			if(!req.files || !req.files.document){
                if(!errors) errors =[];
                errors.push({'param':'document','msg':res.__("admin.other_resources.please_upload_document")});
            }

			if (errors) return res.send({status	: STATUS_ERROR,message	: errors});
			let image           =   (req.files && req.files.document)  ?   req.files.document :"";
			let imgaeOptions    =   {
				'image'     			:   image,
				'filePath'  			:   OTHER_RESOURCES_FILE_PATH,
				'allowedExtensions' 	:   ALLOWED_FILE_EXTENSIONS,
				'allowedImageError'		:	ALLOWED_FILE_ERROR_MESSAGE,
				'allowedMimeTypes' 		: 	ALLOWED_FILE_MIME_EXTENSIONS,
				'allowedMimeError' 		: 	ALLOWED_FILE_MIME_ERROR_MESSAGE

			};

			moveUploadedFile(req, res,imgaeOptions).then(imgaeResponse=>{
                if(imgaeResponse.status == STATUS_ERROR){
                    /** Send error response **/
                    return res.send({
                        status  : STATUS_ERROR,
                        message : [{'param':'document','msg':imgaeResponse.message}],
                    });
                }
				/** Set options **/
				let options = {
					title 		:	title,
					table_name 	: 	"other_resources",
					slug_field 	: 	"slug"
				};

				/** Make Slug */
				getDatabaseSlug(options).then(response=>{
					/** Save other resources details */
					const otherResources = db.collection('other_resources');
					otherResources.insertOne({
						title				:	title,
						slug				: 	(response && response.title)	?	response.title	:"",
						document 			:   (imgaeResponse.fileName)    ?   imgaeResponse.fileName  :"",
						status 				:   ACTIVE,
						created 			: 	getUtcDate(),
						modified 			: 	getUtcDate()
					},(err,result)=>{
						if(err) return next(err);

						/** Send success response */
						req.flash(STATUS_SUCCESS,res.__("admin.other_resources.document_has_been_uploaded_successfully"));
						res.send({
							status			: STATUS_SUCCESS,
							redirect_url	: WEBSITE_ADMIN_URL+'other_resources',
							message			: res.__("admin.other_resources.document_has_been_uploaded_successfully")
						});
					});
				},error=>{
					/** Send error response */
					res.send({
						status	: STATUS_ERROR,
						message	: [{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again")}]
					});
				});
			}).catch(next);
		}else{
			/** Get language list */
			getLanguages().then(languageList=>{
				req.breadcrumbs(BREADCRUMBS['admin/other_resources/add']);
				/**Render add page */
				res.render('add',{
					language_list	: languageList
				});
			}).catch(next);
		}
	};//End addOtherResource()

}
module.exports = new OtherResource();
