const asyncParallel	= require("async/parallel");
const { ObjectID, ObjectId } = require("bson");
const clone			= require("clone");

function PastPapers() {

	/**
	 * Function to get past paper list
	 *
	 * @param req As Request Data
	 * @param res As Response Data
	 *
	 * @return render/json
	 */
	this.getPastPaperList = (req, res,next)=>{
		if(isPost(req)){
			let limit			= (req.body.length) ? parseInt(req.body.length)	: ADMIN_LISTING_LIMIT;
			let skip			= (req.body.start)	? parseInt(req.body.start)	: DEFAULT_SKIP;
			let levelSearch     = (req.body.level_search)   ? req.body.level_search   : "";
            let subjectSearch   = (req.body.subject_search) ? req.body.subject_search   : "";
			let levelId 		= (levelSearch)		?  levelSearch.split(",")[0] : "";
			let subjectId 		= (subjectSearch)	?  subjectSearch.split(",")[0] : "";

			/** Configure Datatable conditions*/
			configDatatable(req,res,null).then(dataTableConfig=>{
				const collection	= db.collection('past_papers');

				/** Set conditions **/
                let commonConditions = {
                    status  : ACTIVE,
                };
				
                /** Conditions for search */
                if (levelId) Object.assign(dataTableConfig.conditions,{"level._id" : ObjectId(levelId)});
                if (subjectId) Object.assign(dataTableConfig.conditions,{"subject._id" : ObjectId(subjectId)});
				
                dataTableConfig.conditions = Object.assign(dataTableConfig.conditions,commonConditions);

				asyncParallel([
					(callback)=>{
						/** Get list **/
						collection.find(dataTableConfig.conditions,{projection: {_id:1,level:1,subject:1,title:1,document:1,modified:1,status:1}}).collation(COLLATION_VALUE).sort(dataTableConfig.sort_conditions).limit(limit).skip(skip).toArray((err,result)=>{
							/** Set options for append image full path **/
							let options = {
								"file_url"          :   PAST_PAPER_FILE_URL,
								"file_path"         :   PAST_PAPER_FILE_PATH,
								"result"            :   result,
								"database_field"    :   "document"
							};
		
							/** Append document with full path **/
							appendFileExistData(options).then(fileResponse=>{
								callback(err, fileResponse.result);
							});
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
			/*** get  level list*/
			let levelOptions = {
				collections		: [
					{
						collection : 'masters',
						columns    : ['_id' ,'name'],
						conditions : {dropdown_type : 'level'}
					},
					{
						collection : 'masters',
						columns    : ['_id' ,'name'],
						conditions : {dropdown_type : 'course'}
					}
				]
			};
			getDropdownList(req,res,next,levelOptions).then(levelList=>{
				if(levelList.status == STATUS_ERROR){

					/** Send error response **/
					req.flash(STATUS_ERROR,levelList.message);
					res.redirect(WEBSITE_ADMIN_URL);
					return;
				}

				/** render listing page **/
				req.breadcrumbs(BREADCRUMBS['admin/past_papers/list']);
				res.render('list',{
					level_list  : (levelList.final_html_data) ? levelList.final_html_data['0']+'<option class="unit-dropdown optgroup-label" disabled role=separator>Select Grade</option>'+levelList.final_html_data['1'] : ''
				});
			}).catch(next);
		}
	};//End getPastPaperList()

	/**
	 * Function to get detail
	 *
	 * @param req	As	Request Data
	 * @param res	As	Response Data
	 * @param next	As 	Callback argument to the middleware function
	 *
	 * @return json
	 */
	let getPastPaperDetails = (req,res,next)=>{
		return new Promise(resolve=>{
			let pastPaperId = (req.params.id) ? req.params.id : "";

			/** Get other resources details **/
			let collection = db.collection('past_papers');
			collection.findOne({
					_id : ObjectId(pastPaperId)
				},
				{projection: {
					_id:1,title:1,url:1,document:1,level:1,subject:1,modified:1,status:1
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
	                    "file_url"          :   PAST_PAPER_FILE_URL,
	                    "file_path"         :   PAST_PAPER_FILE_PATH,
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
	};// End getPastPaperDetails().

	/**
	 * Function to update video lession
	 *
	 * @param req 	As 	Request Data
	 * @param res 	As 	Response Data
	 * @param next 	As 	Callback argument to the middleware function
	 *
	 * @return render/json
	 */
	this.editPastPaper = async(req, res,next)=>{
		if(isPost(req)){
			/** Sanitize Data **/
			req.body	= sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);
			let id		= (req.params.id) ? req.params.id :"";
			req.body.past_paper_descriptions = (req.body.past_paper_descriptions) ? JSON.parse(req.body.past_paper_descriptions) : '';
			
			if(req.body.past_paper_descriptions === undefined || req.body.past_paper_descriptions[DEFAULT_LANGUAGE_MONGO_ID] === undefined || req.body.past_paper_descriptions[DEFAULT_LANGUAGE_MONGO_ID] == ''){
				/** Send error response */
				return res.send({
					status	: STATUS_ERROR,
					message	: [{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again")}]
				});
			}

			let oldImage      		= 	(req.body.old_image) ? req.body.old_image : "";
			let levelData      		= 	(req.body.levels) ? req.body.levels : {};
			let subjectData      	= 	(req.body.subject) ? req.body.subject : {};
			let languageData		=	clone(req.body.past_paper_descriptions[DEFAULT_LANGUAGE_MONGO_ID]);
			req.body.title			= 	(languageData.title) ? 	languageData.title 	:"";
			
			/** Check validation */
			req.checkBody({
				'levels': {
					notEmpty: true,
					errorMessage: res.__("admin.past_papers.please_select_level_grade")
				},
				'subject': {
					notEmpty: true,
					errorMessage: res.__("admin.past_papers.please_select_subject")
				},
				'title': {
					notEmpty: true,
					isLength:{
                        options: {
                        	min    : TITLE_MIN_LENGTH,
                    		max    : TITLE_MAX_LENGTH,
                        },
                        errorMessage: res.__("admin.past_papers.please_enter_title_min",TITLE_MIN_LENGTH,TITLE_MAX_LENGTH)
                    },
					errorMessage: res.__("admin.past_papers.please_enter_title")
				}
			})


			let title			= 	(req.body.title)? 	req.body.title :"";
			let levelId    		= 	(levelData && Object.keys(levelData).length > NOT) 	? 	levelData.split(',')[0] :"";
			let levelName  		= 	(levelData && Object.keys(levelData).length > NOT) 	? 	levelData.split(',')[1] :"";
			let subjectId    	= 	(subjectData && Object.keys(subjectData).length > NOT) 	? 	subjectData.split(',')[0] :"";
			let subjectName  	= 	(subjectData && Object.keys(subjectData).length > NOT) 	? 	subjectData.split(',')[1] :"";

			/** parse Validation array  **/
			let errors = parseValidation(req.validationErrors(),req);
			if(!oldImage && (!req.files || !req.files.document)){
                if(!errors) errors =[];
                errors.push({'param':'document','msg':res.__("admin.past_papers.please_upload_document")});
            }
			if (errors) return res.send({status	: STATUS_ERROR,message	: errors});
			
		 	/** Set options for upload image **/
            let document   =   (req.files && req.files.document)  ?   req.files.document :"";
            let imgaeOptions =   {
				'image'     			:   document,
				'filePath'  			:   PAST_PAPER_FILE_PATH,
				'allowedExtensions' 	:   ALLOWED_FILE_EXTENSIONS,
				'allowedImageError'		:	ALLOWED_FILE_ERROR_MESSAGE,
				'allowedMimeTypes' 		: 	ALLOWED_FILE_MIME_EXTENSIONS,
				'allowedMimeError' 		: 	ALLOWED_FILE_MIME_ERROR_MESSAGE
            };

			let updateData = {
				title 		: title,
				level       : {_id : ObjectId(levelId), name : levelName},
				subject     : {_id : ObjectId(subjectId), name : subjectName},
				modified 	: getUtcDate()
			}

			if(document) {
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
			


			/** Update past paper details **/
			let collection = db.collection("past_papers");
			collection.updateOne({_id : ObjectId(id)},{$set: updateData},(err,result)=>{
					if(err) return next(err);

					/** Send success response **/
					req.flash(STATUS_SUCCESS,res.__("admin.past_papers.past_paper_has_been_updated_successfully"));
					res.send({
						status			: STATUS_SUCCESS,
						redirect_url	: WEBSITE_ADMIN_URL+'past_papers',
						message			: res.__("admin.past_papers.past_paper_has_been_updated_successfully"),
					});
				}
			);
		}else{
			/** Get language list **/
			getLanguages().then(languageList=>{
				/** Get details **/
				getPastPaperDetails(req,res,next).then(response=>{
					if(response.status != STATUS_SUCCESS){
						/** Send error response **/
						req.flash(STATUS_ERROR,response.message);
						res.redirect(WEBSITE_ADMIN_URL+'past_papers');
						return;
					}

					let levelId = (response.result) ? response.result["level"]["_id"] : "";
					let subjectId = (response.result) ? response.result["subject"]["_id"] : "";
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
							},
							{
								collection : 'masters',
								selected   : [levelId],
								conditions : {
									dropdown_type : "course", 
									status : ACTIVE
								},
								columns : ['_id','name']
							},
						]
					};
					getDropdownList(req,res,next,options).then(dropdownList=>{

						/** Render edit pa	ge **/
						req.breadcrumbs(BREADCRUMBS['admin/past_papers/edit']);
						res.render('edit',{
							result			: 	response.result,
							language_list	:	languageList,
							level_list 		: 	dropdownList.final_html_data['0']+'<option class="unit-dropdown optgroup-label" disabled role=separator>Select Grade</option>'+dropdownList.final_html_data['2'],
							subject_list 	: 	dropdownList.final_html_data['1']
						});
					}).catch(next)
				}).catch(next);
			}).catch(next);
		}
	};//End editPastPaper()

	/**
	 * Function for add past paper
	 *
	 * @param req 	As	Request Data
	 * @param res 	As	Response Data
	 * @param next 	As 	Callback argument to the middleware function
	 *
	 * @return render/json
	 */
	this.addPastPaper = (req, res,next)=>{
		if(isPost(req)){

			/** Sanitize Data */
			req.body = 	sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);
			req.body.past_paper_descriptions = (req.body.past_paper_descriptions) ? JSON.parse(req.body.past_paper_descriptions) : '';

			if(req.body.past_paper_descriptions === undefined || req.body.past_paper_descriptions[DEFAULT_LANGUAGE_MONGO_ID] === undefined || req.body.past_paper_descriptions[DEFAULT_LANGUAGE_MONGO_ID] == ''){
				/** Send error response */
				return res.send({
					status	: STATUS_ERROR,
					message	: [{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again")}]
				});
			}


			let levelData      		= 	(req.body.levels) ? req.body.levels : "";
			let subjectData      	= 	(req.body.subject) ? req.body.subject : {};
			let languageData		=	clone(req.body.past_paper_descriptions[DEFAULT_LANGUAGE_MONGO_ID]);
			req.body.title			= 	(languageData.title) ? 	languageData.title 	:"";


			/** Check validation */
			req.checkBody({
				'levels': {
					notEmpty: true,
					errorMessage: res.__("admin.past_papers.please_select_level_grade")
				},
				'subject': {
					notEmpty: true,
					errorMessage: res.__("admin.past_papers.please_select_subject")
				},
				'title': {
					notEmpty: true,
					isLength:{
                        options: {
                        	min    : TITLE_MIN_LENGTH,
                    		max    : TITLE_MAX_LENGTH,
                        },
                        errorMessage: res.__("admin.past_papers.please_enter_title_min",TITLE_MIN_LENGTH,TITLE_MAX_LENGTH)
                    },
					errorMessage: res.__("admin.past_papers.please_enter_title")
				}
			})
		
			let title		= 	(req.body.title) 		? 	req.body.title :"";
			let levelId    = 	(levelData) 			? 	levelData.split(',')[0] :"";
			let levelName  = 	(levelData) 			? 	levelData.split(',')[1] :"";
			let subjectId    = 	(subjectData && Object.keys(subjectData).length > NOT) 	? 	subjectData.split(',')[0] :"";
			let subjectName  = 	(subjectData && Object.keys(subjectData).length > NOT) 	? 	subjectData.split(',')[1] :"";

			/** parse Validation array  */
			let errors = parseValidation(req.validationErrors(),req);
			if(!req.files || !req.files.document){
                if(!errors) errors =[];
                errors.push({'param':'document','msg':res.__("admin.past_papers.please_upload_document")});
            }

			if (errors) return res.send({status	: STATUS_ERROR,message	: errors});
			let image           =   (req.files && req.files.document)  ?   req.files.document :"";
			let imgaeOptions    =   {
				'image'     			:   image,
				'filePath'  			:   PAST_PAPER_FILE_PATH,
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
					table_name 	: 	"past_papers",
					slug_field 	: 	"slug"
				};

				/** Make Slug */
				getDatabaseSlug(options).then(response=>{
					/** Save other resources details */
					let pastPapers = db.collection('past_papers');
					pastPapers.insertOne({
						title				:	title,
						slug				: 	(response && response.title)	?	response.title	:"",
						document 			:   (imgaeResponse.fileName)    ?   imgaeResponse.fileName  :"",
						level              	: 	{_id : ObjectId(levelId), name : levelName},
						subject             : 	{_id : ObjectId(subjectId), name : subjectName},
						status 				:   ACTIVE,
						created 			: 	getUtcDate(),
						modified 			: 	getUtcDate()
					},(err,result)=>{
						if(err) return next(err);

						/** Send success response */
						req.flash(STATUS_SUCCESS,res.__("admin.past_papers.past_paper_has_been_added_successfully"));
						res.send({
							status			: STATUS_SUCCESS,
							redirect_url	: WEBSITE_ADMIN_URL+'past_papers',
							message			: res.__("admin.past_papers.past_paper_has_been_added_successfully")
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
						},
						{
							collection : 'masters',
							selected   : [],
							conditions : {
								dropdown_type : "course", 
								status : ACTIVE
							},
							columns : ['_id','name']
						}
					]
				};
				getDropdownList(req,res,next,options).then(dropdownList=>{

					req.breadcrumbs(BREADCRUMBS['admin/past_papers/add']);
					/**Render add page */
					res.render('add',{
						language_list	: languageList,
						level_list 		: dropdownList.final_html_data['0']+'<option class="unit-dropdown optgroup-label" disabled role=separator>Select Grade</option>'+dropdownList.final_html_data['1']
					});
				}).catch(next);
			}).catch(next);
		}
	};//End addPastPaper()

}
module.exports = new PastPapers();
