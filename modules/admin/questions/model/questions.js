const asyncParallel	= require("async/parallel");
const clone			= require("clone");
const { ObjectId } = require("mongodb");

function Questions() {

	/**
	 * Function to get cms list
	 *
	 * @param req As Request Data
	 * @param res As Response Data
	 *
	 * @return render/json
	 */
	this.getQuestionList = (req, res,next)=>{
		if(isPost(req)){
			/** Sanitize Data **/
			req.body	= sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);
            let limit           = (req.body.length)         ? parseInt(req.body.length)         : ADMIN_LISTING_LIMIT;
            let skip            = (req.body.start)          ? parseInt(req.body.start)          : DEFAULT_SKIP;
            let levelSearch     = (req.body.level_search)   ? req.body.level_search   : "";
            let subjectSearch   = (req.body.subject_search) ? req.body.subject_search   : "";

			let levelId 	= 	(levelSearch)?  levelSearch.split(",")[0] : "";
			let subjectId 	= 	(subjectSearch)?  subjectSearch.split(",")[0] : "";
			
            /** Configure DataTable conditions*/
            configDatatable(req,res,null).then(dataTableConfig=>{
                /** Set conditions **/
                let commonConditions = {
                    is_deleted      : NOT_DELETED,
                };
				
                /** Conditions for search */
                if (levelId) Object.assign(dataTableConfig.conditions,{"level._id" : ObjectId(levelId)});
                if (subjectId) Object.assign(dataTableConfig.conditions,{"subject._id" : ObjectId(subjectId)});
				
                dataTableConfig.conditions = Object.assign(dataTableConfig.conditions,commonConditions);
                const collection    = db.collection("questions");
                asyncParallel([
                    (callback)=>{
                        /** Get list of user's **/
                        collection.aggregate([
                            {$match: dataTableConfig.conditions},
                            {$project: {
                                _id:1,question: 1,level:1, subject : 1, created:1,modified:1
                            }},
                            {$sort : dataTableConfig.sort_conditions},
                            {$skip : skip},
                            {$limit: limit}
                        ]).collation(COLLATION_VALUE).toArray((err, result)=>{
                            callback(err, result);
                        });
                    },
                    (callback)=>{
                        /** Get total number of records in product collection **/
                        collection.countDocuments(commonConditions,(err,countResult)=>{
                            callback(err, countResult);
                        });
                    },
                    (callback)=>{
                        /** Get filtered records couting in product **/
                        collection.countDocuments(dataTableConfig.conditions,(err,filterContResult)=>{
                            callback(err, filterContResult);
                        });
                    }
                ],
                (err,response)=>{
                    /** Send response **/
                    res.send({
                        status          : (!err) ? STATUS_SUCCESS : STATUS_ERROR,
                        draw            : dataTableConfig.result_draw,
                        data            : (response[0]) ? response[0] : [],
                        recordsFiltered : (response[2]) ? response[2] : 0,
                        recordsTotal    : (response[1]) ? response[1] : 0
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
				req.breadcrumbs(BREADCRUMBS["admin/question/list"]);
				res.render("list",{
					level_list  : (levelList.final_html_data) ? levelList.final_html_data['0'] : ''
				});
			}).catch(next);
        }
	};//End getQuestionList()

	/**
	 * Function to get question's detail
	 *
	 * @param req	As	Request Data
	 * @param res	As	Response Data
	 * @param next	As 	Callback argument to the middleware function
	 *
	 * @return json
	 */
	let getQuestionDetails = (req,res,next)=>{
		return new Promise(resolve=>{
			let id = (req.params.id) ? req.params.id : "";
			/** Get Cms details **/
			const collection = db.collection('questions');
			collection.findOne({
					_id : ObjectId(id)
				},
				{projection: {}},(err, result)=>{
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
	};// End getQuestionDetails().

	/**
	 * Function to update question's detail
	 *
	 * @param req 	As 	Request Data
	 * @param res 	As 	Response Data
	 * @param next 	As 	Callback argument to the middleware function
	 *
	 * @return render/json
	 */
	this.editQuestion = async(req, res,next)=>{
		if(isPost(req)){
			/** Sanitize Data **/
			req.body	= sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);
			let id		= (req.params.id) ? req.params.id :"";

			if(id == "" || typeof req.body.qns_data === typeof undefined || (typeof req.body.qns_data[DEFAULT_LANGUAGE_MONGO_ID] === typeof undefined || !req.body.qns_data[DEFAULT_LANGUAGE_MONGO_ID] || req.body.qns_data[DEFAULT_LANGUAGE_MONGO_ID] == '')){
				/** Send error response **/
				return res.send({
					status	: STATUS_ERROR,
					message	: [{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again")}]
				});
			}


			let level			= 	(req.body.level)		 	?	req.body.level	:"";
			let subject			= 	(req.body.subject)  		? 	req.body.subject :"";
			let correctAnswer 	= 	(req.body.correct_answer)	?  	req.body.correct_answer : "";
			let allData			= 	req.body;
			req.body			=	clone(allData.qns_data[DEFAULT_LANGUAGE_MONGO_ID]);
			req.body['level'] 	= 	level;
			req.body['subject'] = 	subject;
			req.body['correct_answer'] 	= correctAnswer;
			
			/** Check validation */
			req.checkBody({
				'level': {
					notEmpty: true,
					errorMessage: res.__("admin.question.please_select_level")
				},
				'subject': {
					notEmpty: true,
					errorMessage: res.__("admin.question.please_select_subject")
				},
				'question': {
					notEmpty: true,
					isLength:{
                        options: {
                            min    : TITLE_MIN_LENGTH,
                            max    : TITLE_MAX_LENGTH,
                        },
                        errorMessage: res.__("admin.question.please_enter_question_min_max",TITLE_MIN_LENGTH,TITLE_MAX_LENGTH)
                    },
					errorMessage: res.__("admin.question.please_enter_question")
				}
			});

			/** parse Validation array  */
			let errors = (parseValidation(req.validationErrors(),req)) ? parseValidation(req.validationErrors(),req) :[];

			let options = (req.body.options) ? req.body.options : [];
			if(!correctAnswer) errors.push({'location' : 'body', 'param':'correct_answer','msg':res.__("admin.question.please_choose_one_option_as_answer"), 'value' : ''});
			options.map((row, index)=>{
				if(!row.name)  errors.push({'location' : 'body', 'param':'name','msg':res.__("admin.question.option_name_can_not_be_null"), 'value' : ''});
			});

			if (errors && errors.length > NOT) {
				/** Send error response */
				return res.send({
					status	: STATUS_ERROR,
					message	: errors,
				});
			}

			let question 	= 	(req.body.question)?  req.body.question : "";
			let levelId 	= 	(level && Object.keys(level).length > NOT)?  level.split(",")[0] : "";
			let levelName 	= 	(level && Object.keys(level).length > NOT)?  level.split(",")[1] : "";
			let subjectId 	= 	(subject && Object.keys(subject).length > NOT)?  subject.split(",")[0] : "";
			let subjectName	= 	(subject && Object.keys(subject).length > NOT)?  subject.split(",")[1] : "";

			/** Update question details **/
			const collection = db.collection("questions");
			collection.updateOne({
					_id : ObjectId(id)
				},
				{$set: {
					level				:	{_id : ObjectId(levelId), name : levelName},
					subject				: 	{_id : ObjectId(subjectId), name : subjectName},
					question            :   question,
					correct_answer      :   correctAnswer,
					options				: 	(allData.qns_data)	?	allData.qns_data[ENGLISH_LANGUAGE_MONGO_ID]['options'] :{},
					modified 			:	getUtcDate()
				}},(err,result)=>{
					if(err) return next(err);

					/** Send success response **/
					req.flash(STATUS_SUCCESS,res.__("admin.question.question_details_has_been_updated_successfully"));
					res.send({
						status			: STATUS_SUCCESS,
						redirect_url	: WEBSITE_ADMIN_URL+'questions',
						message			: res.__("admin.question.question_details_has_been_updated_successfully"),
					});
				}
			);
		}else{
			/** Get language list **/
			getLanguages().then(languageList=>{
				/** Get question details **/
				getQuestionDetails(req,res,next).then(response=>{
					if(response.status != STATUS_SUCCESS){
						/** Send error response **/
						req.flash(STATUS_ERROR,response.message);
						res.redirect(WEBSITE_ADMIN_URL+'questions');
						return;
					}

					/*** get level list*/
					let levelId 	= (response.result.level) ? response.result.level['_id'] : ObjectId();
					let subjectId 	= (response.result.subject) ? response.result.subject['_id'] : ObjectId();
					let levelOptions = {
						collections		: [
							{
								collection : 'masters',
								columns    : ['_id' ,'name'],
								conditions : {dropdown_type : 'level'},
								selected   : [levelId]
							},
							{
								collection : 'subjects',
								columns    : ['_id' ,'name'],
								conditions : {level_id : ObjectId(levelId)},
								selected   : [subjectId]
							}
						]
					};

					getDropdownList(req,res,next,levelOptions).then(levelList=>{
						if(levelList.status == STATUS_ERROR){
							/** Send error response **/
							req.flash(STATUS_ERROR,response.message);
							res.redirect(WEBSITE_ADMIN_URL+'questions');
							return;
						}
				
						/** Render edit page **/
						req.breadcrumbs(BREADCRUMBS['admin/question/edit']);
						res.render('edit',{
							result				: 	response.result,
							language_list		:	languageList,
							level_list   		:   (levelList.final_html_data) ? levelList.final_html_data['0'] : '',
							subject_list   		:   (levelList.final_html_data) ? levelList.final_html_data['1'] : ''
						});
					}).catch(next);
				}).catch(next);
			}).catch(next);
		}
	};//End editQuestion()

	/**
	 * Function for add question
	 *
	 * @param req 	As	Request Data
	 * @param res 	As	Response Data
	 * @param next 	As 	Callback argument to the middleware function
	 *
	 * @return render/json
	 */
	this.addQuestion = async(req, res,next)=>{
		if(isPost(req)){
			/** Sanitize Data */
			req.body = 	sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);
			if(req.body.qns_data === undefined || req.body.qns_data[DEFAULT_LANGUAGE_MONGO_ID] === undefined || req.body.qns_data[DEFAULT_LANGUAGE_MONGO_ID] == ''){
				/** Send error response */
				return res.send({
					status	: STATUS_ERROR,
					message	: [{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again")}]
				});
			}


			let level			= 	(req.body.level)		 ?	req.body.level	:"";
			let subject			= 	(req.body.subject)  ? 	req.body.subject :"";
			let correctAnswer 	= 	(req.body.correct_answer)?  req.body.correct_answer : "";
			let allData			= 	req.body;
			req.body			=	clone(allData.qns_data[DEFAULT_LANGUAGE_MONGO_ID]);
			req.body['correct_answer'] 	= correctAnswer;
			req.body['level'] 		= level;
			req.body['subject'] 	= subject;

			
			/** Check validation */
			req.checkBody({
				'level': {
					notEmpty: true,
					errorMessage: res.__("admin.question.please_select_level")
				},
				'subject': {
					notEmpty: true,
					errorMessage: res.__("admin.question.please_select_subject")
				},
				'question': {
					notEmpty: true,
					isLength:{
                        options: {
                            min    : TITLE_MIN_LENGTH,
                            max    : TITLE_MAX_LENGTH,
                        },
                        errorMessage: res.__("admin.question.please_enter_question_min_max",TITLE_MIN_LENGTH,TITLE_MAX_LENGTH)
                    },
					errorMessage: res.__("admin.question.please_enter_question")
				}
			});

			/** parse Validation array  */
			let errors = (parseValidation(req.validationErrors(),req)) ? parseValidation(req.validationErrors(),req) :[];

			let options = (req.body.options) ? req.body.options : [];
			if(!correctAnswer) errors.push({'location' : 'body', 'param':'correct_answer','msg':res.__("admin.question.please_choose_one_option_as_answer"), 'value' : ''});
			options.map((row, index)=>{
				if(!row.name)  errors.push({'location' : 'body', 'param':'name','msg':res.__("admin.question.option_name_can_not_be_null"), 'value' : ''});
			});

			if (errors && errors.length > NOT) {
				/** Send error response */
				return res.send({
					status	: STATUS_ERROR,
					message	: errors,
				});
			}
			
			let question 	= 	(req.body.question)?  req.body.question : "";
			let levelId 	= 	(level && Object.keys(level).length > NOT)?  level.split(",")[0] : "";
			let levelName 	= 	(level && Object.keys(level).length > NOT)?  level.split(",")[1] : "";
			let subjectId 	= 	(subject && Object.keys(subject).length > NOT)?  subject.split(",")[0] : "";
			let subjectName	= 	(subject && Object.keys(subject).length > NOT)?  subject.split(",")[1] : "";

			/** Save question details */
			const collection = db.collection('questions');
			collection.insertOne({
				level				:	{_id : ObjectId(levelId), name : levelName},
				subject				: 	{_id : ObjectId(subjectId), name : subjectName},
				question            :   question,
				correct_answer      :   correctAnswer,
				options				: 	(allData.qns_data)	?	allData.qns_data[ENGLISH_LANGUAGE_MONGO_ID]['options'] :[],
				is_deleted          :   NOT_DELETED,
				created 			: 	getUtcDate(),
				modified 			: 	getUtcDate()
			},(err,result)=>{
				if(err) return next(err);

				/** Send success response */
				req.flash(STATUS_SUCCESS,res.__("admin.question.question_has_been_added_successfully"));
				res.send({
					status			: STATUS_SUCCESS,
					redirect_url	: WEBSITE_ADMIN_URL+'questions',
					message			: res.__("admin.question.question_has_been_added_successfully")
				});
			});
		}else{
			/** Get language list */
			getLanguages().then(languageList=>{

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
						res.redirect(WEBSITE_ADMIN_URL+'questions');
						return;
					}
					req.breadcrumbs(BREADCRUMBS['admin/question/add']);
					/**Render add question page */
					res.render('add',{
						language_list	: languageList,
						level_list      : (levelList.final_html_data) ? levelList.final_html_data['0'] : ''
					});

				}).catch(next);
			}).catch(next);
		}
	};//End addQuestion()

	saveQuestion = (req,res,next,options)=>{

	}

	/**
	 * Function for delete question
	 *
	 * @param req 	As	Request Data
	 * @param res 	As	Response Data
	 * @param next 	As 	Callback argument to the middleware function
	 *
	 * @return render/json
	 */
	this.deleteQuestion = (req, res,next)=>{
		let id		= (req.params.id) ? req.params.id :"";
		if(!id){
			/** Send error response **/
			req.flash(STATUS_ERROR,res.__("admin.system.something_going_wrong_please_try_again"));
			res.redirect(WEBSITE_ADMIN_URL+'questions');
			return;
		}

		/** Save question details */
		const collection = db.collection('questions');
		collection.updateOne(
            {_id : ObjectId(id)},
            {$set : {
                is_deleted  : DELETED,
                deleted_at  : getUtcDate(),
                modified    : getUtcDate()
            }},(err,result)=>{
                if(err) return next(err);

                /** Send success response **/
                req.flash(STATUS_SUCCESS,res.__("admin.question.question_deleted_successfully"));
                res.redirect(WEBSITE_ADMIN_URL+"questions");
            }
        );

	};//End deleteQuestion()

}
module.exports = new Questions();
