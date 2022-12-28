const asyncParallel	= require("async/parallel");
const clone			= require("clone");
const { ObjectId } = require("mongodb");
const { NumberInstance } = require("twilio/lib/rest/pricing/v2/number");

function Units() {

	/**
	 * Function to get unit list
	 *
	 * @param req As Request Data
	 * @param res As Response Data
	 *
	 * @return render/json
	 */
	this.getUnitList = (req, res,next)=>{
		if(isPost(req)){
			let limit			= (req.body.length) ? parseInt(req.body.length)	: ADMIN_LISTING_LIMIT;
			let skip			= (req.body.start)	? parseInt(req.body.start)	: DEFAULT_SKIP;
			let levelSearch     = (req.body.level_search)   ? req.body.level_search   : "";
            let subjectSearch   = (req.body.subject_search) ? req.body.subject_search   : "";

			let levelId 		= (levelSearch)		?  levelSearch.split(",")[0] : "";
			let subjectId 		= (subjectSearch)	?  subjectSearch.split(",")[0] : "";

			/** Configure Datatable conditions*/
			configDatatable(req,res,null).then(dataTableConfig=>{
				/** Set conditions **/
				let commonConditions = {
					status      : ACTIVE,
				};
				
				/** Conditions for search */
				if (levelId) Object.assign(dataTableConfig.conditions,{"level._id" : ObjectId(levelId)});
				if (subjectId) Object.assign(dataTableConfig.conditions,{"subject._id" : ObjectId(subjectId)});
				
				dataTableConfig.conditions = Object.assign(dataTableConfig.conditions,commonConditions);
				let collection		= db.collection('units');
				asyncParallel([
					(callback)=>{
						/** Get list of unit **/
						collection.find(dataTableConfig.conditions,{projection: {_id:1,title:1,sub_title:1,level:1,subject:1,modified:1,status:1}}).collation(COLLATION_VALUE).sort(dataTableConfig.sort_conditions).limit(limit).skip(skip).toArray((err,result)=>{
							callback(err, result);
						});
					},
					(callback)=>{
						/** Get total number of records in units collection **/
						collection.countDocuments({},(err,countResult)=>{
							callback(err, countResult);
						});
					},
					(callback)=>{
						/** Get filtered records counting in unit **/
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
			/*** get  level list*/
			let categoryOptions = {
				collections		: [
					{
						collection : 'masters',
						columns    : ['_id' ,'name'],
						conditions : {dropdown_type : 'level'}
					}
				]
			};
			getDropdownList(req,res,next,categoryOptions).then(levelList=>{
				if(levelList.status == STATUS_ERROR){

					/** Send error response **/
					req.flash(STATUS_ERROR,levelList.message);
					res.redirect(WEBSITE_ADMIN_URL);
					return;
				}
				/** render listing page **/
				req.breadcrumbs(BREADCRUMBS['admin/units/list']);
				res.render('list',{
					level_list : (levelList.final_html_data) ? levelList.final_html_data['0'] : ''
				});
			}).catch(next)
		}
	};//End getUnitList()

	/**
	 * Function to get unit's document detail
	 *
	 * @param req	As	Request Data
	 * @param res	As	Response Data
	 * @param next	As 	Callback argument to the middleware function
	 *
	 * @return json
	 */
	let getUnitDetails = (req,res,next)=>{
		return new Promise(resolve=>{
			let unitId = (req.params.id) ? req.params.id : "";
			/** Get unit documents details **/
			let units = db.collection('units');
			units.findOne({
					_id : ObjectId(unitId)
				},
				{projection: {
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

					let response = {
						status  : STATUS_SUCCESS,
						result  : (result)   ?   result  :{}
					};
					resolve(response);
				}
			);
		});
	};// End getUnitDetails().

	/**
	 * Function to update unit's detail
	 *
	 * @param req 	As 	Request Data
	 * @param res 	As 	Response Data
	 * @param next 	As 	Callback argument to the middleware function
	 *
	 * @return render/json
	 */
	this.editUnit = (req, res,next)=>{
		let unitId = (req.params.id) ? req.params.id : ""; 
		if(isPost(req)){
			
			/** Sanitize Data */
			req.body = 	sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);
			let level		= 	(req.body.level) 	? 	req.body.level 		:"";
			let subject		= 	(req.body.subject) 	? 	req.body.subject 	:"";
			let title		= 	(req.body.title) 	? 	req.body.title 		:"";
			let order		= 	(req.body.order) 	? 	req.body.order 		:NOT;
			let subTitle	= 	(req.body.sub_title)? req.body.sub_title 	:"";
			
			/** Check validation */
			req.checkBody({
				'level': {
					notEmpty: true,
					errorMessage: res.__("admin.units.please_select_level")
				},
				'subject': {
					notEmpty: true,
					errorMessage: res.__("admin.units.please_select_subject")
				},
				'title': {
					notEmpty: true,
					isLength:{
                        options: {
                        	min    : TITLE_MIN_LENGTH,
                    		max    : TITLE_MAX_LENGTH,
                        },
                        errorMessage: res.__("admin.units.unit_title_length",TITLE_MIN_LENGTH,TITLE_MAX_LENGTH)
                    },
					errorMessage: res.__("admin.units.please_enter_title")
				},
				'sub_title': {
					notEmpty: true,
					isLength:{
                        options: {
                        	min    : TITLE_MIN_LENGTH,
                    		max    : TITLE_MAX_LENGTH,
                        },
                        errorMessage: res.__("admin.units.unit_subtitle_length",TITLE_MIN_LENGTH,TITLE_MAX_LENGTH)
                    },
					errorMessage: res.__("admin.units.please_enter_subtitle")
				},
				'order': {
					notEmpty: true,
					errorMessage: res.__("admin.units.please_enter_order"),
					isInt: {
						errorMessage: res.__("admin.units.please_only_numeric_order",1)
					}
				},
			})

			/** parse Validation array  **/
			let errors = parseValidation(req.validationErrors(),req);
			if(order <= NOT){
				if(!errors) errors =[];
				errors.push({'param':'order','msg':res.__("admin.units.please_only_numeric_order",1)});
			}
			if (errors) return res.send({status	: STATUS_ERROR,message	: errors});
			
			let levelId 	= level ? level.split(",")[0] : "";
			let levelName 	= level ? level.split(",")[1] : "";
			let subjectId 	= subject ? subject.split(",")[0] : "";
			let subjectName = subject ? subject.split(",")[1] : "";

			/** Save unit details */
			let collection = db.collection('units');
			collection.findOne({
				'_id' 			: {$ne: ObjectId(unitId)}, 
				'order'			: Number(order),
				'level._id' 	: ObjectId(levelId), 
				'subject._id' 	: ObjectId(subjectId)
			},(unitError, unitResult)=>{
				if(unitError) return next(unitError);

				if(unitResult && Object.keys(unitResult).length > NOT){
					if(!errors) errors =[];
					errors.push({'param':'order','msg':res.__("admin.units.order_exist")});
					if (errors) return res.send({status	: STATUS_ERROR,message	: errors});
				}else{
					collection.updateOne({_id : ObjectId(unitId)},
					{$set:{
						level       :   {_id : ObjectId(levelId), name : levelName},
						subject     :   {_id : ObjectId(subjectId), name : subjectName},
						order       :   Number(order),
						title		:	title,
						sub_title	: 	subTitle,
						modified 	: 	getUtcDate()
					}},(err,result)=>{
						if(err) return next(err);
		
						/** Send success response */
						req.flash(STATUS_SUCCESS,res.__("admin.units.unit_has_been_updated_successfully"));
						res.send({
							status			: STATUS_SUCCESS,
							redirect_url	: WEBSITE_ADMIN_URL+'units',
							message			: res.__("admin.units.unit_has_been_updated_successfully")
						});
					});
				}
			});
			
		}else{
			/** Get language list **/
			getLanguages().then(languageList=>{
				/** Get unit document details **/
				getUnitDetails(req,res,next).then(response=>{
					if(response.status != STATUS_SUCCESS){
						/** Send error response **/
						req.flash(STATUS_ERROR,response.message);
						res.redirect(WEBSITE_ADMIN_URL+'units');
						return;
					}

					let levelId = (response.result) ? response.result['level']['_id'] : ObjectId();
					let subjectId = (response.result) ? response.result['subject']['_id'] : ObjectId();
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
							},
							{
								collection : 'subjects',
								selected   : [subjectId],
								conditions : {
									level_id : ObjectId(levelId)
								},
								columns : ['_id','name']
							}
						]
					};
					getDropdownList(req,res,next,options).then(dropdownList=>{
						/** Render edit page **/
						req.breadcrumbs(BREADCRUMBS['admin/units/edit']);
						res.render('edit',{
							unit_id         :   unitId,
							result			: 	response.result,
							language_list	:	languageList,
							level_list 		: 	dropdownList.final_html_data['0'],
							subject_list 	: 	dropdownList.final_html_data['1'],
						});
					}).catch(next);
				}).catch(next);
			}).catch(next);
		}
	};//End editUnit()

	/**
	 * Function for add unit
	 *
	 * @param req 	As	Request Data
	 * @param res 	As	Response Data
	 * @param next 	As 	Callback argument to the middleware function
	 *
	 * @return render/json
	 */
	this.addUnit = (req, res,next)=>{

		if(isPost(req)){

			/** Sanitize Data */
			req.body = 	sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);
			let level		= 	(req.body.level) 	? 	req.body.level 		:"";
			let subject		= 	(req.body.subject) 	? 	req.body.subject 	:"";
			let title		= 	(req.body.title) 	? 	req.body.title 		:"";
			let order		= 	(req.body.order) 	? 	req.body.order 		:NOT;
			let subTitle	= 	(req.body.sub_title)? req.body.sub_title 	:"";
			
			/** Check validation */
			req.checkBody({
				'level': {
					notEmpty: true,
					errorMessage: res.__("admin.units.please_select_level")
				},
				'subject': {
					notEmpty: true,
					errorMessage: res.__("admin.units.please_select_subject")
				},
				'title': {
					notEmpty: true,
					isLength:{
                        options: {
                        	min    : TITLE_MIN_LENGTH,
                    		max    : TITLE_MAX_LENGTH,
                        },
                        errorMessage: res.__("admin.units.unit_title_length",TITLE_MIN_LENGTH,TITLE_MAX_LENGTH)
                    },
					errorMessage: res.__("admin.units.please_enter_title")
				},
				'sub_title': {
					notEmpty: true,
					isLength:{
                        options: {
                        	min    : TITLE_MIN_LENGTH,
                    		max    : TITLE_MAX_LENGTH,
                        },
                        errorMessage: res.__("admin.units.unit_subtitle_length",TITLE_MIN_LENGTH,TITLE_MAX_LENGTH)
                    },
					errorMessage: res.__("admin.units.please_enter_subtitle")
				},
				'order': {
					notEmpty: true,
					errorMessage: res.__("admin.units.please_enter_faq_order"),
					isInt: {
						errorMessage: res.__("admin.units.please_only_numeric_order",1)
					}
				}
			})

			/** parse Validation array  **/
			let errors = parseValidation(req.validationErrors(),req);
			if(order <= NOT){
				if(!errors) errors =[];
				errors.push({'param':'order','msg':res.__("admin.units.please_only_numeric_order",1)});
			}
			if (errors) return res.send({status	: STATUS_ERROR,message	: errors});

			let levelId 	= level ? level.split(",")[0] : "";
			let levelName 	= level ? level.split(",")[1] : "";
			let subjectId 	= subject ? subject.split(",")[0] : "";
			let subjectName = subject ? subject.split(",")[1] : "";

			/** Save unit details */
			let collection = db.collection('units');
			collection.findOne({
				'order' 		: Number(order), 
				'level._id' 	: ObjectId(levelId), 
				'subject._id' 	: ObjectId(subjectId)
			},(unitError, unitResult)=>{
				if(unitError) return next(unitError);
				
				if(unitResult && Object.keys(unitResult).length > NOT){
					if(!errors) errors =[];
					errors.push({'param':'order','msg':res.__("admin.units.order_exist")});
					if (errors) return res.send({status	: STATUS_ERROR,message	: errors});
				}else{
					collection.insertOne({
						level               :   {_id : ObjectId(levelId), name : levelName},
						subject             :   {_id : ObjectId(subjectId), name : subjectName},
						title				:	title,
						sub_title			: 	subTitle,
						order				: 	Number(order),
						status 				:   ACTIVE,
						created 			: 	getUtcDate(),
						modified 			: 	getUtcDate()
					},(err,result)=>{
						if(err) return next(err);

						/** Send success response */
						req.flash(STATUS_SUCCESS,res.__("admin.units.unit_has_been_added_successfully"));
						res.send({
							status			: STATUS_SUCCESS,
							redirect_url	: WEBSITE_ADMIN_URL+'units',
							message			: res.__("admin.units.unit_has_been_added_successfully")
						});
					});
				}
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
				req.breadcrumbs(BREADCRUMBS['admin/units/add']);

				/**Render add page */
				res.render('add',{
					level_list 		: dropdownList.final_html_data['0'],
				});
			}).catch(next);
		}
	};//End addUnit()

		/**
	 * Function to get unit list
	 *
	 * @param req As Request Data
	 * @param res As Response Data
	 *
	 * @return render/json
	 */
	this.getUnitDocumentList = (req, res,next)=>{
		let unitId = (req.params.id) ? req.params.id : "";
		if(isPost(req)){
			let limit			= (req.body.length) ? parseInt(req.body.length)	: ADMIN_LISTING_LIMIT;
			let skip			= (req.body.start)	? parseInt(req.body.start)	: DEFAULT_SKIP;
			let collection		= db.collection('unit_documents');

			/** Configure Datatable conditions*/
			configDatatable(req,res,null).then(dataTableConfig=>{
				dataTableConfig.conditions['unit_id'] = ObjectId(unitId)
				asyncParallel([
					(callback)=>{
						/** Get list of unit **/
						collection.find(dataTableConfig.conditions,{projection: {_id:1,title:1,document_type:1,modified:1,status:1}}).collation(COLLATION_VALUE).sort(dataTableConfig.sort_conditions).limit(limit).skip(skip).toArray((err,result)=>{
							callback(err, result);
						});
					},
					(callback)=>{
						/** Get total number of records in units collection **/
						collection.countDocuments({unit_id : ObjectId(unitId)},(err,countResult)=>{
							callback(err, countResult);
						});
					},
					(callback)=>{
						/** Get filtered records counting in unit **/
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
			/** render document listing page **/
			req.breadcrumbs(BREADCRUMBS['admin/units/document_list']);
			res.render('document_list',{
				unit_id : unitId
			});
		}
	};//End getUnitDocumentList()

	/**
	 * Function for add unit
	 *
	 * @param req 	As	Request Data
	 * @param res 	As	Response Data
	 * @param next 	As 	Callback argument to the middleware function
	 *
	 * @return render/json
	*/
	this.addUnitDocument = async(req, res,next)=>{
		let unitId = (req.params.id) ? req.params.id : "";
		if(isPost(req)){

			/** Sanitize Data */
			req.body = 	sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);
			let documentType = 	(req.body.document_type) 	? 	req.body.document_type 		:"";
			let title		 = 	(req.body.title) 	? 	req.body.title 		:"";

			/** Check validation */
			req.checkBody({
				'document_type': {
					notEmpty: true,
					errorMessage: res.__("admin.units.please_select_level")
				},
				'title': {
					notEmpty: true,
					isLength:{
						options: {
							min    : TITLE_MIN_LENGTH,
							max    : TITLE_MAX_LENGTH,
						},
						errorMessage: res.__("admin.units.unit_title_length",TITLE_MIN_LENGTH,TITLE_MAX_LENGTH)
					},
					errorMessage: res.__("admin.units.please_enter_title")
				}
			})

			/** parse Validation array  **/
			let errors = parseValidation(req.validationErrors(),req);
			
			if(!req.files || !req.files.document){
                if(!errors) errors =[];
                errors.push({'param':'document','msg':res.__("admin.system.please_upload_file")});
            }
			if (errors) return res.send({status	: STATUS_ERROR,message	: errors});

			let documentTypeId 	= documentType ? documentType.split(",")[0] : "";
			let documentTypeName 	= documentType ? documentType.split(",")[1] : "";
			let insertData = {
				unit_id             :   ObjectId(unitId),
				document_type       :   {_id : ObjectId(documentTypeId), name : documentTypeName},
				title				:	title,
				status 				:   ACTIVE,
				created 			: 	getUtcDate(),
				modified 			: 	getUtcDate()
			};

			/** Set options for upload image **/
            let image   =   (req.files && req.files.document)  ?   req.files.document :"";
            let imgaeOptions =   {
                'image'     			:   image,
                'filePath'  			:   EXAMINER_MIND_FILE_PATH,
				'allowedExtensions' 	:   ALLOWED_FILE_EXTENSIONS,
				'allowedImageError'		:	ALLOWED_FILE_ERROR_MESSAGE,
				'allowedMimeTypes' 		: 	ALLOWED_FILE_MIME_EXTENSIONS,
				'allowedMimeError' 		: 	ALLOWED_FILE_MIME_ERROR_MESSAGE
            };
			if(image) {
				let imgaeResponse = await moveUploadedFile(req, res,imgaeOptions);
				if(imgaeResponse.status == STATUS_ERROR){
					/** Send error response **/
					return res.send({
						status  : STATUS_ERROR,
						message : [{'param':'document','msg':imgaeResponse.message}],
					});
				}
				insertData['document'] = imgaeResponse.fileName   ?   imgaeResponse.fileName   :""
			}

			/** Save unit details */
			let collection = db.collection('unit_documents');
			collection.insertOne(insertData,(err,result)=>{
				if(err) return next(err);

				/** Send success response */
				req.flash(STATUS_SUCCESS,res.__("admin.units.document_has_been_added_successfully"));
				res.send({
					status			: STATUS_SUCCESS,
					redirect_url	: WEBSITE_ADMIN_URL+'units/documents/'+unitId,
					message			: res.__("admin.units.document_has_been_added_successfully")
				});
			});
		}else{
			let options = {
				collections:[
					{
						collection : 'masters',
						selected   : [],
						conditions : {
							dropdown_type : "unit_document_type", 
							status : ACTIVE
						},
						columns : ['_id','name']
					}
				]
			};
			getDropdownList(req,res,next,options).then(dropdownList=>{
				req.breadcrumbs(BREADCRUMBS['admin/units/document_add']);

				/**Render add page */
				res.render('document_add',{
					unit_id					: unitId,	
					dynamic_url				: unitId,	
					dynamic_variable		: unitId,	
					unit_document_type 		: dropdownList.final_html_data['0'],
				});
			}).catch(next);
		}
	};//End addUnitDocument()

		/**
	 * Function to get unit's document detail
	 *
	 * @param req	As	Request Data
	 * @param res	As	Response Data
	 * @param next	As 	Callback argument to the middleware function
	 *
	 * @return json
	 */
	let getUnitDocumentDetails = (req,res,next)=>{
		return new Promise(resolve=>{
			let documentId = (req.params.id) ? req.params.id : "";
			/** Get unit documents details **/
			const unitDocuments = db.collection('unit_documents');
			unitDocuments.findOne({
					_id : ObjectId(documentId)
				},
				{projection: {
					_id:1,unit_id:1,document_type:1,title:1,document:1
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
						"file_url"          :   EXAMINER_MIND_FILE_URL,
						"file_path"         :   EXAMINER_MIND_FILE_PATH,
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
	};// End getUnitDocumentDetails().

	/**
	 * Function to update unit's document detail
	 *
	 * @param req 	As 	Request Data
	 * @param res 	As 	Response Data
	 * @param next 	As 	Callback argument to the middleware function
	 *
	 * @return render/json
	 */
	this.editUnitDocument = (req, res,next)=>{
		let unitId = (req.params.unit_id) ? req.params.unit_id : ""; 
		let docId  = (req.params.id) ? req.params.id : ""; 
		if(isPost(req)){
			
			/** Sanitize Data */
			req.body = 	sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);
			let documentType = 	(req.body.document_type) 	? 	req.body.document_type 		:"";
			let title		 = 	(req.body.title) 	? 	req.body.title 		:"";

			/** Check validation */
			req.checkBody({
				'document_type': {
					notEmpty: true,
					errorMessage: res.__("admin.units.please_select_level")
				},
				'title': {
					notEmpty: true,
					isLength:{
						options: {
							min    : TITLE_MIN_LENGTH,
							max    : TITLE_MAX_LENGTH,
						},
						errorMessage: res.__("admin.units.unit_title_length",TITLE_MIN_LENGTH,TITLE_MAX_LENGTH)
					},
					errorMessage: res.__("admin.units.please_enter_title")
				}
			})
			
			/** parse Validation array  **/
			let errors = parseValidation(req.validationErrors(),req);
			if (errors) return res.send({status	: STATUS_ERROR,message	: errors});
			let documentTypeId 	= documentType ? documentType.split(",")[0] : "";
			let documentTypeName 	= documentType ? documentType.split(",")[1] : "";
			/** Set options for upload image **/
			let oldimage=   (req.body.old_image) ? req.body.old_image :"";
			let document   =   (req.files && req.files.document)  ?   req.files.document :"";
			let imgaeOptions =   {
				'image'     			:   document,
				'oldPath'   			:   oldimage,
				'filePath'  			:   EXAMINER_MIND_FILE_PATH,
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

				/** Update unit document details **/
				const unitDocuments = db.collection("unit_documents");
				unitDocuments.updateOne({
						_id : ObjectId(docId)
					},
					{$set: {
						title				:	title,
						document_type       :   {_id : ObjectId(documentTypeId), name : documentTypeName},
						document    		:  	imgaeResponse.fileName   ?   imgaeResponse.fileName   :"",
						modified 			:	getUtcDate()
					}},(err,result)=>{
						if(err) return next(err);

						/** Send success response **/
						req.flash(STATUS_SUCCESS,res.__("admin.units.document_details_has_been_updated_successfully"));
						res.send({
							status			: STATUS_SUCCESS,
							redirect_url	: WEBSITE_ADMIN_URL+'units/documents/'+unitId,
							message			: res.__("admin.units.document_details_has_been_updated_successfully"),
						});
					}
				);
			}).catch(next);
		}else{
			/** Get language list **/
			getLanguages().then(languageList=>{
				/** Get unit document details **/
				getUnitDocumentDetails(req,res,next).then(response=>{
					if(response.status != STATUS_SUCCESS){
						/** Send error response **/
						req.flash(STATUS_ERROR,response.message);
						res.redirect(WEBSITE_ADMIN_URL+'unit/documents/'+unitId);
						return;
					}

					let documentType = (response.result && response.result.document_type) ? response.result['document_type']['_id'] : ObjectId();
					let options = {
						collections:[
							{
								collection : 'masters',
								selected   : [documentType],
								conditions : {
									dropdown_type : "unit_document_type", 
									status : ACTIVE
								},
								columns : ['_id','name']
							}
						]
					};
					getDropdownList(req,res,next,options).then(dropdownList=>{
						/** Render edit page **/
						req.breadcrumbs(BREADCRUMBS['admin/units/document_edit']);
						res.render('document_edit',{
							unit_id         :   unitId,
							result			: 	response.result,
							language_list	:	languageList,
							dynamic_url		: unitId,	
							dynamic_variable: unitId,
							unit_document_type : dropdownList.final_html_data['0'],
						});
					}).catch(next);
				}).catch(next);
			}).catch(next);
		}
	};//End editUnitDocument()
}
module.exports = new Units();
