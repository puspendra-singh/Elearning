const asyncParallel	= require("async/parallel");
const clone			= require("clone");
const { appendFile } = require("fs");
const { ObjectId } = require("mongodb");

function Courses() {

	/**
	 * Function to get categories list
	 *
	 * @param req As Request Data
	 * @param res As Response Data
	 *
	 * @return render/json
	 */
	this.getCourseList = (req, res,next)=>{
		if(isPost(req)){
			let limit			= (req.body.length) ? parseInt(req.body.length)	: ADMIN_LISTING_LIMIT;
			let skip			= (req.body.start)	? parseInt(req.body.start)	: DEFAULT_SKIP;
			const collection	= db.collection('courses');

			/** Configure Datatable conditions*/
			configDatatable(req,res,null).then(dataTableConfig=>{
				dataTableConfig.conditions['parent_id'] = {$exists : false}
				asyncParallel([
					(callback)=>{
						/** Get list of courses **/
						collection.find(dataTableConfig.conditions,{projection: {_id:1,name:1,modified:1,is_active:1}}).collation(COLLATION_VALUE).sort(dataTableConfig.sort_conditions).limit(limit).skip(skip).toArray((err,result)=>{
							callback(err, result);
						});
					},
					(callback)=>{
						/** Get total number of records in courses collection **/
						collection.countDocuments({parent_id : {$exists : false}},(err,countResult)=>{
							callback(err, countResult);
						});
					},
					(callback)=>{
						/** Get filtered records counting in courses **/
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
			req.breadcrumbs(BREADCRUMBS['admin/courses/list']);
			res.render('list');
		}
	};//End getCourseList()

	/**
	 * Function to get course's detail
	 *
	 * @param req	As	Request Data
	 * @param res	As	Response Data
	 * @param next	As 	Callback argument to the middleware function
	 *
	 * @return json
	 */
	let getCourseDetails = (req,res,next)=>{
		return new Promise(resolve=>{
			let courseId = (req.params.id) ? req.params.id : "";
			/** Get course details **/
			const collection = db.collection('courses');
			collection.findOne({
					_id : ObjectId(courseId)
				},
				{projection: {
					_id:1,name:1,modified:1,descriptions:1
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
	};// End getCourseDetails().

	/**
	 * Function to update course's detail
	 *
	 * @param req 	As 	Request Data
	 * @param res 	As 	Response Data
	 * @param next 	As 	Callback argument to the middleware function
	 *
	 * @return render/json
	 */
	this.editCourse = (req, res,next)=>{
		if(isPost(req)){
			/** Sanitize Data **/
			req.body	= sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);
			let id		= (req.params.id) ? req.params.id :"";

			if(id == "" || typeof req.body.descriptions === typeof undefined || (typeof req.body.descriptions[DEFAULT_LANGUAGE_MONGO_ID] === typeof undefined || !req.body.descriptions[DEFAULT_LANGUAGE_MONGO_ID] || req.body.descriptions[DEFAULT_LANGUAGE_MONGO_ID] == '')){
				/** Send error response **/
				return res.send({
					status	: STATUS_ERROR,
					message	: [{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again")}]
				});
			}

			let allData		= req.body;
			req.body		= clone(allData.descriptions[DEFAULT_LANGUAGE_MONGO_ID]);

			/** Check validation **/
			req.checkBody({
				'name': {
					notEmpty: true,
					errorMessage: res.__("admin.course.please_enter_name")
				},
			});


			/** parse Validation array  **/
			let errors = parseValidation(req.validationErrors(),req);
			if (errors) {
				/** Send error response **/
				return res.send({
					status	: STATUS_ERROR,
					message	: errors,
				});
			}

			/** Check name is unique **/
			const collection = db.collection("courses");
			collection.findOne({
				parent_id       :   {$exists : false},
				name			:	{$regex : '^'+cleanRegex(req.body.name)+'$',$options : 'i'},
				_id				:	{$ne : ObjectId(id)}
			},{projection: {_id:1}},
			(err, result)=>{
				if(err) return next(err);
				
				let errMessageArray = 	[];
				if(result){
					errMessageArray.push({'param':'name','msg':res.__("admin.course.entered_name_already_exists")});
				}

				if(errMessageArray.length > NOT){
					/** Send error response **/
					return res.send({
						status	: STATUS_ERROR,
						message	: errMessageArray
					});								
				}	


				/** Update course details **/
				collection.updateOne({
						_id : ObjectId(id)
					},
					{$set: {
						name				: 	(req.body.name)	?	req.body.name	:"",
						default_language_id	: 	DEFAULT_LANGUAGE_MONGO_ID,
						descriptions		: 	(allData.descriptions) ? allData.descriptions :{},
						modified 			:	getUtcDate()
					}},(err,result)=>{
						if(err) return next(err);

						/** Send success response **/
						req.flash(STATUS_SUCCESS,res.__("admin.course.course_details_has_been_updated_successfully"));
						res.send({
							status			: STATUS_SUCCESS,
							redirect_url	: WEBSITE_ADMIN_URL+'courses',
							message			: res.__("admin.course.course_details_has_been_updated_successfully"),
						});
					}
				);
			});
		}else{
			/** Get language list **/
			getLanguages().then(languageList=>{
				/** Get category details **/
				getCourseDetails(req,res,next).then(response=>{
					if(response.status != STATUS_SUCCESS){
						/** Send error response **/
						req.flash(STATUS_ERROR,response.message);
						res.redirect(WEBSITE_ADMIN_URL+'courses');
						return;
					}

					/** Render edit page **/
					req.breadcrumbs(BREADCRUMBS['admin/courses/edit']);
					res.render('edit',{
						result			: 	response.result,
						language_list	:	languageList
					});
				}).catch(next);
			}).catch(next);
		}
	};//End editCourse()

	/**
	 * Function for add course
	 *
	 * @param req 	As	Request Data
	 * @param res 	As	Response Data
	 * @param next 	As 	Callback argument to the middleware function
	 *
	 * @return render/json
	 */
	this.addCourse = (req, res,next)=>{
		if(isPost(req)){
			/** Sanitize Data */
			req.body = 	sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);
			if(req.body.descriptions === undefined || req.body.descriptions[DEFAULT_LANGUAGE_MONGO_ID] === undefined || req.body.descriptions[DEFAULT_LANGUAGE_MONGO_ID] == ''){
				/** Send error response */
				return res.send({
					status	: STATUS_ERROR,
					message	: [{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again")}]
				});
			}

			let allData		= 	req.body;
			req.body		=	clone(allData.descriptions[DEFAULT_LANGUAGE_MONGO_ID]);
			let name		= 	(req.body.name) ? 	req.body.name 	:"";

			/** Check validation */
			req.checkBody({
				'name': {
					notEmpty: true,
					errorMessage: res.__("admin.course.please_enter_name")
				},
			})

			/** parse Validation array  */
			let errors = parseValidation(req.validationErrors(),req);
			if (errors) {
				/** Send error response */
				return res.send({
					status	: STATUS_ERROR,
					message	: errors,
				});
			}

			/** Check name is unique **/
			const collection = db.collection('courses');
			collection.findOne({
				parent_id	:	{$exists : false},
				name		:	{$regex : '^'+cleanRegex(name)+'$',$options : 'i'}
			},{projection: {_id:1}},(err, result)=>{
				if(err) return next(err);
				
				let errMessageArray	=	[];
				if(result){
					errMessageArray.push({'param':'name','msg':res.__("admin.course.entered_name_already_exists")});
				}

				if(errMessageArray.length > NOT){
					/** Send error response **/
					return res.send({
						status	: STATUS_ERROR,
						message	: errMessageArray,
					});
				}

				/** Set options **/
				let options = {
					title 		:	name,
					table_name 	: 	"courses",
					slug_field 	: 	"slug"
				};

				/** Make Slug */
				getDatabaseSlug(options).then(response=>{
					/** Save course details */
					collection.insertOne({
						name				:	name,
						slug				: 	(response && response.title)	?	response.title	:"",
						default_language_id	: 	DEFAULT_LANGUAGE_MONGO_ID,
						descriptions		: 	(allData.descriptions)	?	allData.descriptions :{},
						created 			: 	getUtcDate(),
						modified 			: 	getUtcDate()
					},(err,result)=>{
						if(err) return next(err);

						/** Send success response */
						req.flash(STATUS_SUCCESS,res.__("admin.course.course_has_been_added_successfully"));
						res.send({
							status			: STATUS_SUCCESS,
							redirect_url	: WEBSITE_ADMIN_URL+'courses',
							message			: res.__("admin.course.course_has_been_added_successfully")
						});
					});
				},error=>{
					/** Send error response */
					res.send({
						status	: STATUS_ERROR,
						message	: [{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again")}]
					});
				});
			});
		}else{
			/** Get language list */
			getLanguages().then(languageList=>{
				req.breadcrumbs(BREADCRUMBS['admin/courses/add']);
				/**Render add course page */
				res.render('add',{
					language_list	: languageList
				});
			}).catch(next);
		}
	};//End addCourse()


	/**
	 * Function to get syllabus list
	 *
	 * @param req As Request Data
	 * @param res As Response Data
	 *
	 * @return render/json
	 */
	this.getSyllabusList = (req, res,next)=>{
		if(isPost(req)){
			let limit			= (req.body.length) ? parseInt(req.body.length)	: ADMIN_LISTING_LIMIT;
			let skip			= (req.body.start)	? parseInt(req.body.start)	: DEFAULT_SKIP;
			let collection		= db.collection('subjects');

			/** Configure Datatable conditions*/
			configDatatable(req,res,null).then(dataTableConfig=>{
				asyncParallel([
					(callback)=>{
						/** Get list of syllabus **/
						collection.find(dataTableConfig.conditions,{projection: {_id:1,name:1,modified:1,is_active:1}}).collation(COLLATION_VALUE).sort(dataTableConfig.sort_conditions).limit(limit).skip(skip).toArray((err,result)=>{
							callback(err, result);
						});
					},
					(callback)=>{
						/** Get total number of records(syllabus) in collection **/
						collection.countDocuments((err,countResult)=>{
							callback(err, countResult);
						});
					},
					(callback)=>{
						/** Get filtered records(syllabus) counting in collection **/
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
			req.breadcrumbs(BREADCRUMBS['admin/subjects/list']);
			res.render('list_syllabus');
		}
	};//End getSyllabusList()

	/**
	 * Function to get syllabus's detail
	 *
	 * @param req	As	Request Data
	 * @param res	As	Response Data
	 * @param next	As 	Callback argument to the middleware function
	 *
	 * @return json
	 */
	let getSyllabusDetails = (req,res,next)=>{
		return new Promise(resolve=>{
			let subjectId = (req.params.id) ? req.params.id : "";
			/** Get category details **/
			let collection = db.collection('subjects');
			collection.findOne({
					_id : ObjectId(subjectId)
				},
				{projection: {
					_id:1,name:1,icon_image : 1,level_id :1,modified:1,descriptions:1
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

					let options = {
						"file_url" 			: SUBJECT_ICON_URL,
						"file_path" 		: SUBJECT_ICON_FILE_PATH,
						"result" 			: [result],
						"database_field" 	: "icon_image"
					};

					appendFileExistData(options).then(fileResponse=>{

						/** Send success response **/
						let response = {
							status	: STATUS_SUCCESS,
							result 	: (fileResponse && fileResponse.result && fileResponse.result[0])	?	fileResponse.result[0]	:{}
						};
						resolve(response);
					})
				}
			);
		});
	};// End getSyllabusDetails().

	/**
	 * Function to update syllabus's detail
	 *
	 * @param req 	As 	Request Data
	 * @param res 	As 	Response Data
	 * @param next 	As 	Callback argument to the middleware function
	 *
	 * @return render/json
	 */
	this.editSyllabus = (req, res,next)=>{
		if(isPost(req)){
			/** Sanitize Data **/
			req.body	= sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);
			let id		= (req.params.id) ? req.params.id :"";

			let name		= (req.body.name) ? req.body.name : "";
			let levelObject = (req.body.level) ? req.body.level : "";
			let levelId     = levelObject.split(",")[0];
		
			/** Check validation **/
			req.checkBody({
				'name': {
					notEmpty: true,
					errorMessage: res.__("admin.course.please_enter_name")
				},
				'level': {
					notEmpty: true,
					errorMessage: res.__("admin.course.please_select_level")
				},
			});


			/** parse Validation array  **/
			let errors = parseValidation(req.validationErrors(),req);
			if (errors) {
				/** Send error response **/
				return res.send({
					status	: STATUS_ERROR,
					message	: errors,
				});
			}
			/** Check name is unique **/
			let collection = db.collection("subjects");
			collection.findOne({
				level_id	:	ObjectId(levelId),
				name		:	{$regex : '^'+cleanRegex(name)+'$',$options : 'i'},
				_id			:	{$ne : ObjectId(id)}
			},{projection: {_id:1}},
			(err, result)=>{
				if(err) return next(err);
				
				let errMessageArray = 	[];
				if(result){
					errMessageArray.push({'param':'name','msg':res.__("admin.course.entered_name_already_exists")});
				}

				if(errMessageArray.length > NOT){
					/** Send error response **/
					return res.send({
						status	: STATUS_ERROR,
						message	: errMessageArray
					});								
				}	

				/** Set options for upload image **/
                let oldimage=   (req.body.old_image) ? req.body.old_image :"";
                let image   =   (req.files && req.files.icon_image)  ?   req.files.icon_image :"";

                let options =   {
                    'image'     :   image,
                    'filePath'  :   SUBJECT_ICON_FILE_PATH,
                    'oldPath'   :   oldimage
                };

				/** Upload icon  image **/
                moveUploadedFile(req, res,options).then(response=>{
                    if(response.status == STATUS_ERROR){                                            
                        /** Send error response **/
                        return res.send({
                            status  : STATUS_ERROR,
                            message : [{'param':'icon_image','msg':response.message}],
                        });
                    }

					/** Update subject details **/
					collection.updateOne({
							_id : ObjectId(id)
						},
						{$set: {
							name		: 	(req.body.name)	?	req.body.name	:"",
							level_id    :   ObjectId(levelId),
							icon_image  : 	(response.fileName)  ?   response.fileName  :"",
							modified 	:	getUtcDate()
						}},(err,result)=>{
							if(err) return next(err);

							/** Send success response **/
							req.flash(STATUS_SUCCESS,res.__("admin.course.syllabus_details_has_been_updated_successfully"));
							res.send({
								status			: STATUS_SUCCESS,
								redirect_url	: WEBSITE_ADMIN_URL+'subjects',
								message			: res.__("admin.course.syllabus_details_has_been_updated_successfully"),
							});
						}
					);
				})
			});
		}else{
			/** Get language list **/
			getLanguages().then(languageList=>{
				/** Get syllabus details **/
				getSyllabusDetails(req,res,next).then(response=>{
					if(response.status != STATUS_SUCCESS){
						/** Send error response **/
						req.flash(STATUS_ERROR,response.message);
						res.redirect(WEBSITE_ADMIN_URL+'subjects');
						return;
					}
					let options = {
						collections:[{
							collection : 'masters',
							selected   : [response.result.level_id],
							conditions : {
								dropdown_type : "level", 
								status : ACTIVE
							},
							columns : ['_id','name']
						}]
					};
					getDropdownList(req,res,next,options).then(dropdownList=>{
						/** Render edit page **/
						req.breadcrumbs(BREADCRUMBS['admin/subjects/edit']);
						res.render('edit_syllabus',{
							result			: 	response.result,
							language_list	:	languageList,
							level_list 		: 	dropdownList.final_html_data['0']

						});
					}).catch(next);
				}).catch(next);
			}).catch(next);
		}
	};//End editSyllabus()

	/**
	 * Function for add syllabus
	 *
	 * @param req 	As	Request Data
	 * @param res 	As	Response Data
	 * @param next 	As 	Callback argument to the middleware function
	 *
	 * @return render/json
	 */
	this.addSyllabus = (req, res,next)=>{
		if(isPost(req)){
			/** Sanitize Data */
			req.body = 	sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);

			let name		= 	(req.body.name) ? 	req.body.name 	:"";
			let levelObject	= 	(req.body.level) ? 	req.body.level 	:"";
			let levelId     =   levelObject.split(",")[0];

			/** Check validation */
			req.checkBody({
				'name': {
					notEmpty: true,
					errorMessage: res.__("admin.course.please_enter_name")
				},
				'level': {
					notEmpty: true,
					errorMessage: res.__("admin.course.please_select_level")
				},
			});
 

			/** parse Validation array  */
			let errors = parseValidation(req.validationErrors(),req);
			if(!req.files || !req.files.icon_image){
                if(!errors) errors =[];
                errors.push({'param':'icon_image','msg':res.__("admin.user.please_select_image")});
            }

			if(errors || errors.length > NOT){
				/** Send error response **/
				return res.send({
					status	: STATUS_ERROR,
					message	: errors,
				});
			}

			/** Check name is unique **/
			let collection = db.collection('subjects');
			collection.findOne({
				level_id    :   ObjectId(levelId),
				name		:	{$regex : '^'+cleanRegex(name)+'$',$options : 'i'}
			},{projection: {_id:1}},(err, result)=>{
				if(err) return next(err);
				
				if(result){
					if(!errors) errors =[];
					errors.push({'param':'name','msg':res.__("admin.course.entered_name_already_exists")});
				}

				if(errors && errors.length > NOT){
					/** Send error response **/
					return res.send({
						status	: STATUS_ERROR,
						message	: errors,
					});
				}

				let image           =   (req.files && req.files.icon_image)  ?   req.files.icon_image :"";
				let imgaeOptions    =   {
					'image'     :   image,
					'filePath'  :   SUBJECT_ICON_FILE_PATH
				};

				/** Upload user image **/
				moveUploadedFile(req, res,imgaeOptions).then(imgaeResponse=>{
					if(imgaeResponse.status == STATUS_ERROR){
						/** Send error response **/
						return res.send({
							status  : STATUS_ERROR,
							message : [{'param':'icon_image','msg':imgaeResponse.message}],
						});
					}

					/** Save syllabus details */
					collection.insertOne({
						name		:	name,
						level_id    :   ObjectId(levelId),
						icon_image  : 	(imgaeResponse.fileName)    ?   imgaeResponse.fileName  :"",
						created 	: 	getUtcDate(),
						modified 	: 	getUtcDate()
					},(err,result)=>{

						if(err) return next(err);

						/** Send success response */
						req.flash(STATUS_SUCCESS,res.__("admin.course.syllabus_has_been_added_successfully"));
						return res.send({
							status			: STATUS_SUCCESS,
							redirect_url	: WEBSITE_ADMIN_URL+'subjects',
							message			: res.__("admin.course.syllabus_has_been_added_successfully")
						});
					});
					
				})
			});
			
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

					req.breadcrumbs(BREADCRUMBS['admin/subjects/add']);
					/**Render add syllabus page */
					res.render('add_syllabus',{
						language_list	: languageList,
						level_list 		: dropdownList.final_html_data['0']+dropdownList.final_html_data['1']
					});
				}).catch(next)
			}).catch(next);
		}
	};//End addSyllabus()

	/**
	 * Function for delete course
	 *
	 * @param req 	As Request Data
	 * @param res 	As Response Data
	 * @param next 	As Callback argument to the middleware function
	 *
	 * @return render/json
	 */
	this.deleteCourse = (req, res, next)=>{
		let id = 	(req.params.id)	? req.params.id	:"";
		/** Remove  course  record **/
		const collection = db.collection('courses');
		collection.deleteOne({ $or: [ {_id : ObjectId(id)}, {parent_id: ObjectId(id)} ] },(err)=>{
			if(err) return next(err);
			/** Send success response **/
			req.flash(STATUS_SUCCESS,res.__("admin.course.course_has_been_deleted_successfully"));
			res.redirect(WEBSITE_ADMIN_URL+"courses");
		});
	};//End deleteCourse()

	/**
	 * Function for delete syllabus
	 *
	 * @param req 	As Request Data
	 * @param res 	As Response Data
	 * @param next 	As Callback argument to the middleware function
	 *
	 * @return render/json
	 */
	this.deleteSyllabus = (req, res, next)=>{
		let id 			= 	(req.params.id)	? req.params.id	:"";

		/** Remove  subject  record **/
		let collection = db.collection('subjects');
		collection.deleteOne({_id : ObjectId(id)},(err)=>{
			if(err) return next(err);
			/** Send success response **/
			req.flash(STATUS_SUCCESS,res.__("admin.course.syllabus_has_been_deleted_successfully"));
			res.redirect(WEBSITE_ADMIN_URL+"subjects");
		});
	};//End deleteSyllabus()

	/**
	 * Function to get subcategory list as html
	 *
	 * @param req 	As 	Request Data
	 * @param res 	As 	Response Data
	 * @param next 	As 	Callback argument to the middleware function

	 * @return render/json
	 */
	this.getSyllabusListHtml = (req, res,next)=>{
		if(isPost(req)){

			/** Sanitize Data */
			req.body = 	sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);
			let parentId = (req.body.parent_id) ? req.body.parent_id : [];
			let levelName = (req.body.level_name) ? req.body.level_name : '';

			/*** get  subject list*/
			let categoryOptions = {
				collections		: [
					{
						collection : 'subjects',
						columns    : ['_id' ,'name'],
						conditions : {level_id : {$in: arrayToObject(parentId)}},
						selected   : [],
						level_name : levelName
					}
				]
			};
			getDropdownList(req,res,next,categoryOptions).then(response=>{
				if(response.status == STATUS_ERROR){

					/** Send error response */
					res.send({
						status	: STATUS_ERROR,
						subcategory_list   :  ''
					});
				}else{
					/** Send success response */
					res.send({
						status	: STATUS_SUCCESS,
						list   : (response.final_html_data) ? response.final_html_data['0'] : ''
					});
				}
			}).catch(next);
		}else{
			/** Send success response */
			res.send({
				status	: STATUS_SUCCESS,
				subcategory_list   : ''
			});
		}
	}// End getSubCategoryListHtml

	/**
	 * Function to get category list as html
	 *
	 * @param req 	As 	Request Data
	 * @param res 	As 	Response Data
	 * @param next 	As 	Callback argument to the middleware function

	 * @return render/json
	 */
	this.getCategoryListHtml = (req, res,next)=>{
		let id 	= 	(req.params.id)	? req.params.id	:"";

		const collection = db.collection("users");
		collection.findOne({_id	:	ObjectId(id)},{projection: {category:1, sub_category:1}},(err, result)=>{
			let categoryId 		= (result.category) ? result.category : [];
			let subcategoryId 	= (result.sub_category) ? result.sub_category : [];

			/*** get category list*/
			let categoryOptions = {
				collections		: [
					{
						collection : 'categories',
						columns    : ['_id' ,'name'],
						conditions : {_id : {$in: categoryId}},
						selected   : categoryId
					},
					{
						collection : 'categories',
						columns    : ['_id' ,'name'],
						conditions : {_id : {$in: subcategoryId}},
						selected   : subcategoryId
					}
				]
			};
			getDropdownList(req,res,next,categoryOptions).then(categoryList=>{

				/** Send success response */
				res.send({
					status				: STATUS_SUCCESS,
					category_list   	: (categoryList.final_html_data) ? categoryList.final_html_data['0'] : '',
					subcategory_list   	: (categoryList.final_html_data) ? categoryList.final_html_data['1'] : ''
				});
			}).catch(next);
		});
	}// End getSubCategoryListHtml
}
module.exports = new Courses();
