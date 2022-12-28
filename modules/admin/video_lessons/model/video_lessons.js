const asyncParallel	= require("async/parallel");
const { ObjectID, ObjectId } = require("bson");
const clone			= require("clone");

function VideoLessons() {

	/**
	 * Function to get lesson list
	 *
	 * @param req As Request Data
	 * @param res As Response Data
	 *
	 * @return render/json
	 */
	this.getVideoLessonList = (req, res,next)=>{
		if(isPost(req)){
			let limit			= (req.body.length) ? parseInt(req.body.length)	: ADMIN_LISTING_LIMIT;
			let skip			= (req.body.start)	? parseInt(req.body.start)	: DEFAULT_SKIP;
			let levelSearch     = (req.body.level_search)   ? req.body.level_search   : "";
            let subjectSearch   = (req.body.subject_search) ? req.body.subject_search   : "";

			let levelId 	= 	(levelSearch)?  levelSearch.split(",")[0] : "";
			let subjectId 	= 	(subjectSearch)?  subjectSearch.split(",")[0] : "";

			/** Configure Datatable conditions*/
			configDatatable(req,res,null).then(dataTableConfig=>{
				const collection	= db.collection('video_lessons');

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
						collection.find(dataTableConfig.conditions,{projection: {_id:1,level:1,subject:1,title:1,image:1,modified:1,status:1}}).collation(COLLATION_VALUE).sort(dataTableConfig.sort_conditions).limit(limit).skip(skip).toArray((err,result)=>{
							/** Set options for append image full path **/
							let options = {
								"file_url"          :   VIDEO_LESSON_URL,
								"file_path"         :   VIDEO_LESSON_FILE_PATH,
								"result"            :   result,
								"database_field"    :   "image"
							};
		
							/** Append image with full path **/
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
				req.breadcrumbs(BREADCRUMBS['admin/video_lessons/list']);
				res.render('list',{
					level_list  : (levelList.final_html_data) ? levelList.final_html_data['0'] : ''
				});
			}).catch(next);
		}
	};//End getVideoLessionList()

	/**
	 * Function to get detail
	 *
	 * @param req	As	Request Data
	 * @param res	As	Response Data
	 * @param next	As 	Callback argument to the middleware function
	 *
	 * @return json
	 */
	let getVideoLessonDetails = (req,res,next)=>{
		return new Promise(resolve=>{
			let videoLessonId = (req.params.id) ? req.params.id : "";

			/** Get other resources details **/
			let collection = db.collection('video_lessons');
			collection.findOne({
					_id : ObjectId(videoLessonId)
				},
				{projection: {
					_id:1,title:1,url:1,image:1,level:1,subject:1,modified:1,status:1
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
	                    "file_url"          :   VIDEO_LESSON_URL,
	                    "file_path"         :   VIDEO_LESSON_FILE_PATH,
	                    "result"            :   [result],
	                    "database_field"    :   "image"
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
	};// End getVideoLessonDetails().

	/**
	 * Function to update video lession
	 *
	 * @param req 	As 	Request Data
	 * @param res 	As 	Response Data
	 * @param next 	As 	Callback argument to the middleware function
	 *
	 * @return render/json
	 */
	this.editVideoLesson = async(req, res,next)=>{
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

			let oldImage      		= 	(req.body.old_image) ? req.body.old_image : "";
			let levelData      		= 	(req.body.levels) ? req.body.levels : "";
			let subjectData      	= 	(req.body.subject) ? req.body.subject : "";
			let videoUrl      		= 	(req.body.video_url) ? req.body.video_url : "";
			let languageData		=	clone(req.body.other_resources_descriptions[DEFAULT_LANGUAGE_MONGO_ID]);
			req.body.title			= 	(languageData.title) ? 	languageData.title 	:"";
			
			/** Check validation **/
			req.checkBody({
				'levels': {
					notEmpty: true,
					errorMessage: res.__("admin.video_lessons.please_select_level")
				},
				'subject': {
					notEmpty: true,
					errorMessage: res.__("admin.video_lessons.please_select_subject")
				},
				'video_url': {
					notEmpty: true,
					matches	 : {
						options    	: '^(https?\:\/\/)?((www\.)?youtube\.com|youtu\.be)\/.+$',
						errorMessage:res.__("admin.video_lessons.please_enter_valid_url")
					},
					errorMessage: res.__("admin.video_lessons.please_enter_url")
				},
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
			let levelId    = 	(levelData) 			? 	levelData.split(',')[0] :"";
			let levelName  = 	(levelData) 			? 	levelData.split(',')[1] :"";
			let subjectId    = 	(subjectData) 			? 	subjectData.split(',')[0] :"";
			let subjectName  = 	(subjectData) 			? 	subjectData.split(',')[1] :"";

			/** parse Validation array  **/
			let errors = parseValidation(req.validationErrors(),req);
			if(!oldImage && (!req.files || !req.files.image)){
                if(!errors) errors =[];
                errors.push({'param':'image','msg':res.__("admin.video_lessons.please_upload_image")});
            }
			if (errors) return res.send({status	: STATUS_ERROR,message	: errors});
			
		 	/** Set options for upload image **/
            let image   =   (req.files && req.files.image)  ?   req.files.image :"";
            let imgaeOptions =   {
                'image'     :   image,
                'filePath'  :   VIDEO_LESSON_FILE_PATH,
            };

			let updateData = {
				title 		: title,
				url         : videoUrl,
				level       : {_id : ObjectId(levelId), name : levelName},
				subject     : {_id : ObjectId(subjectId), name : subjectName},
				modified 	: getUtcDate()
			}

			if(image) {
				let imgaeResponse = await moveUploadedFile(req, res,imgaeOptions);
				if(imgaeResponse.status == STATUS_ERROR){
					/** Send error response **/
					return res.send({
						status  : STATUS_ERROR,
						message : [{'param':'image','msg':imgaeResponse.message}],
					});
				}
				updateData['image'] = imgaeResponse.fileName   ?   imgaeResponse.fileName   :""
			}
			


			/** Update video lesson details **/
			let videoLessons = db.collection("video_lessons");
			videoLessons.updateOne({_id : ObjectId(id)},{$set: updateData},(err,result)=>{
					if(err) return next(err);

					/** Send success response **/
					req.flash(STATUS_SUCCESS,res.__("admin.video_lessons.document_has_been_uploaded_successfully"));
					res.send({
						status			: STATUS_SUCCESS,
						redirect_url	: WEBSITE_ADMIN_URL+'video_lessons',
						message			: res.__("admin.video_lessons.document_has_been_uploaded_successfully"),
					});
				}
			);
		}else{
			/** Get language list **/
			getLanguages().then(languageList=>{
				/** Get details **/
				getVideoLessonDetails(req,res,next).then(response=>{
					if(response.status != STATUS_SUCCESS){
						/** Send error response **/
						req.flash(STATUS_ERROR,response.message);
						res.redirect(WEBSITE_ADMIN_URL+'video_lessons');
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
							}
						]
					};
					getDropdownList(req,res,next,options).then(dropdownList=>{

						/** Render edit pa	ge **/
						req.breadcrumbs(BREADCRUMBS['admin/video_lessons/edit']);
						res.render('edit',{
							result			: 	response.result,
							language_list	:	languageList,
							level_list 		: 	dropdownList.final_html_data['0'],
							subject_list 	: 	dropdownList.final_html_data['1']
						});
					}).catch(next)
				}).catch(next);
			}).catch(next);
		}
	};//End editVideoLession()

	/**
	 * Function for add video lesson
	 *
	 * @param req 	As	Request Data
	 * @param res 	As	Response Data
	 * @param next 	As 	Callback argument to the middleware function
	 *
	 * @return render/json
	 */
	this.addVideoLesson = (req, res,next)=>{
		if(isPost(req)){

			/** Sanitize Data */
			req.body = 	sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);
			req.body.video_lessons_descriptions = (req.body.video_lessons_descriptions) ? JSON.parse(req.body.video_lessons_descriptions) : '';

			if(req.body.video_lessons_descriptions === undefined || req.body.video_lessons_descriptions[DEFAULT_LANGUAGE_MONGO_ID] === undefined || req.body.video_lessons_descriptions[DEFAULT_LANGUAGE_MONGO_ID] == ''){
				/** Send error response */
				return res.send({
					status	: STATUS_ERROR,
					message	: [{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again")}]
				});
			}


			let levelData      		= 	(req.body.levels) ? req.body.levels : "";
			let subjectData      	= 	(req.body.subject) ? req.body.subject : "";
			let videoUrl      		= 	(req.body.video_url) ? req.body.video_url : "";
			let languageData		=	clone(req.body.video_lessons_descriptions[DEFAULT_LANGUAGE_MONGO_ID]);
			req.body.title			= 	(languageData.title) ? 	languageData.title 	:"";


			/** Check validation */
			req.checkBody({
				'levels': {
					notEmpty: true,
					errorMessage: res.__("admin.video_lessons.please_select_level")
				},
				'subject': {
					notEmpty: true,
					errorMessage: res.__("admin.video_lessons.please_select_subject")
				},
				'video_url': {
					notEmpty: true,
					matches	 : {
						options    	: '^(https?\:\/\/)?((www\.)?youtube\.com|youtu\.be)\/.+$',
						errorMessage:res.__("admin.video_lessons.please_enter_valid_url")
					},
					errorMessage: res.__("admin.video_lessons.please_enter_url")
				},
				'title': {
					notEmpty: true,
					isLength:{
                        options: {
                        	min    : TITLE_MIN_LENGTH,
                    		max    : TITLE_MAX_LENGTH,
                        },
                        errorMessage: res.__("admin.video_lessons.please_enter_title_min",TITLE_MIN_LENGTH,TITLE_MAX_LENGTH)
                    },
					errorMessage: res.__("admin.video_lessons.please_enter_title")
				}
			})
		
			let title		= 	(req.body.title) 		? 	req.body.title :"";
			let levelId    = 	(levelData) 			? 	levelData.split(',')[0] :"";
			let levelName  = 	(levelData) 			? 	levelData.split(',')[1] :"";
			let subjectId    = 	(subjectData) 			? 	subjectData.split(',')[0] :"";
			let subjectName  = 	(subjectData) 			? 	subjectData.split(',')[1] :"";

			/** parse Validation array  */
			let errors = parseValidation(req.validationErrors(),req);
			if(!req.files || !req.files.image){
                if(!errors) errors =[];
                errors.push({'param':'image','msg':res.__("admin.video_lessons.please_upload_image")});
            }

			if (errors) return res.send({status	: STATUS_ERROR,message	: errors});
			let image           =   (req.files && req.files.image)  ?   req.files.image :"";
			let imgaeOptions    =   {
				'image'     	:   image,
				'filePath'  	:   VIDEO_LESSON_FILE_PATH
			};

			moveUploadedFile(req, res,imgaeOptions).then(imgaeResponse=>{
                if(imgaeResponse.status == STATUS_ERROR){
                    /** Send error response **/
                    return res.send({
                        status  : STATUS_ERROR,
                        message : [{'param':'image','msg':imgaeResponse.message}],
                    });
                }
				/** Set options **/
				let options = {
					title 		:	title,
					table_name 	: 	"video_lessons",
					slug_field 	: 	"slug"
				};

				/** Make Slug */
				getDatabaseSlug(options).then(response=>{
					/** Save other resources details */
					const videoLesson = db.collection('video_lessons');
					videoLesson.insertOne({
						title				:	title,
						slug				: 	(response && response.title)	?	response.title	:"",
						image 				:   (imgaeResponse.fileName)    ?   imgaeResponse.fileName  :"",
						url                 :   videoUrl,
						level              	: 	{_id : ObjectId(levelId), name : levelName},
						subject             : 	{_id : ObjectId(subjectId), name : subjectName},
						status 				:   ACTIVE,
						created 			: 	getUtcDate(),
						modified 			: 	getUtcDate()
					},(err,result)=>{
						if(err) return next(err);

						/** Send success response */
						req.flash(STATUS_SUCCESS,res.__("admin.video_lessons.lesson_has_been_added_successfully"));
						res.send({
							status			: STATUS_SUCCESS,
							redirect_url	: WEBSITE_ADMIN_URL+'video_lessons',
							message			: res.__("admin.video_lessions.lesson_has_been_added_successfully")
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
						}
					]
				};
				getDropdownList(req,res,next,options).then(dropdownList=>{

					req.breadcrumbs(BREADCRUMBS['admin/video_lessons/add']);
					/**Render add page */
					res.render('add',{
						language_list	: languageList,
						level_list 		: dropdownList.final_html_data['0']
					});
				}).catch(next);
			}).catch(next);
		}
	};//End addVideoLesson()

}
module.exports = new VideoLessons();
