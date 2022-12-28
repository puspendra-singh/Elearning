const asyncParallel		= require("async/parallel");
const clone				= require("clone");
const asyncforEachOf	= require("async/forEachOf");
const { ObjectId } 		= require("mongodb");
function Examinations() {

	/**
	 * Function to get list
	 *
	 * @param req As Request Data
	 * @param res As Response Data
	 *
	 * @return render/json
	 */
	this.getList = (req, res,next)=>{
		if(isPost(req)){
			let limit			= (req.body.length) ? parseInt(req.body.length)	: ADMIN_LISTING_LIMIT;
			let skip			= (req.body.start)	? parseInt(req.body.start)	: DEFAULT_SKIP;
			const collection	= db.collection('examinations');
			

			/** Configure Datatable conditions*/
			configDatatable(req,res,null).then(dataTableConfig=>{
				
				asyncParallel([
					(callback)=>{
						/** Get list of exam **/
						collection.aggregate([
			                {$project: {
			                	_id : 1, modified:1, name:1, time_duration:1
			                }},
			                {$match: dataTableConfig.conditions},
			                {$sort:dataTableConfig.sort_conditions},
			                {$skip: skip},
							{$limit: limit},
			            ]).toArray((err,result)=>{
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
			req.breadcrumbs(BREADCRUMBS['admin/examinations/list']);
			res.render('list');
		}
	};//End getList()

	/**
	 * Function to get result detail
	 *
	 * @param req 	As 	Request Data
	 * @param res 	As 	Response Data
	 * @param next 	As 	Callback argument to the middleware function
	 *
	 * @return render/json
	 */
	this.viewResult = (req, res,next)=>{
		let id   		= (req.params.id)   ? req.params.id : "";
		let page 		= (req.params.page) ? req.params.page : ACTIVE;
		if(isPost(req)){

			/** Sanitize Data */
			req.body 		= 	sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);
			let userId		= 	(req.body.user_id)		?	req.body.user_id:"";
			let resultType	= 	(req.body.result_type)	?	req.body.result_type:"";
			let services	= 	(req.body.services) 	? 	req.body.services :[];
			let isPassed    =   DEACTIVE;
			if(resultType == 'exam-result-pass-btn-id'){
				/** Check validation */
				req.checkBody({
					'user_id': {
						notEmpty: true,
						errorMessage: res.__("admin.examinations.please_select_user")
					},
					'services': {
						notEmpty: true,
						errorMessage: res.__("admin.examinations.please_select_atleast_one_service")
					}
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
				isPassed = ACTIVE
			}

			asyncParallel([
				(callback)=>{
					let users = db.collection('users');
					users.findOneAndUpdate({_id : ObjectId(userId)},{$set: {activated_services : arrayToObject(services)}},(err, result)=>{
		            	callback(err, result);
		            })
				},
				(callback)=>{
					let examinations = db.collection('examinations');
					examinations.findOneAndUpdate({_id : ObjectId(id), user_id : ObjectId(userId)},{$set: {is_completed : ACTIVE, is_passed : isPassed}},(err, result)=>{
		            	callback(err, result);
		            })
				}
			],
			(err, response)=>{
				if(err) return next(err);

				req.flash(STATUS_SUCCESS,res.__("admin.examinations.service_activation_completed"));
				res.send({
					status			: STATUS_SUCCESS,
					redirect_url	: WEBSITE_ADMIN_URL+'examinations',
					message			: res.__("admin.examinations.service_activation_completed")
				});
				return ;
			});
		}else{
			let languageId 	= DEFAULT_LANGUAGE_MONGO_ID;
			let limit  		= page*ADMIN_LISTING_LIMIT;
			let skip   		= limit-ADMIN_LISTING_LIMIT;
			const collection= db.collection('examinations');
			asyncParallel([
				(callback)=>{
					/** Get exam details **/
					collection.aggregate([
		                {$match: {_id : ObjectId(id)}},
		                {$addFields:{total_questions : {'$size' :'$exam_questions'}}},
		                {$addFields:{total_pages : {$ceil:{ $divide: [ "$total_questions", ADMIN_LISTING_LIMIT ]}}}},
		                {$unwind : '$exam_questions'},
		                {$limit: limit},
				        {$skip : skip},
				        {$lookup:{
				          	from: "questions",
				          	let: { questionId: "$exam_questions._id", user_answer :'$exam_questions.user_answer', is_answer :  '$exam_questions.is_answer',correct_answer :  '$exam_questions.correct_answer'},
				          	pipeline: [
				             	{$match: {
					                $expr: {
					                  $and: [
					                    { $eq: ["$_id", "$$questionId"] },
					                    { $eq: ["$is_deleted", NOT_DELETED] },
					                  ],
					                },
				             	}},
				             	{$project:{
				               		_id :1, question_type :1, correct_answer:'$$correct_answer',user_answer :'$$user_answer',
				               		is_answer:'$$is_answer', qns_data : "$qns_data."+languageId+""
				             	}},
				             	{$addFields:{
				             		'qns_data.question_id' 		: "$_id",
				             		'qns_data.is_answer' 		: "$is_answer",
				             		'qns_data.user_answer' 		: "$user_answer",
				               		'qns_data.correct_answer' 	: "$correct_answer",
				               		'qns_data.question_type' 	: "$question_type",
				             	}}
				          	],
				          	as: "questionDetail",
				      	}},
				      	{$group:{
			       			_id            	: '$_id',
			       			user_id 		: { $first :'$user_id'}, 
			       			total_pages 	: { $first :'$total_pages'},  
			       			is_passed 		: { $first :'$is_passed'},  
			       			is_completed 	: { $first :'$is_completed'},  
			       			total_questions : { $first :'$total_questions'},  
				       		qns_data       	: { $push: {'$arrayElemAt': ["$questionDetail.qns_data",0]}},
				      	}}
					]).toArray((err, result)=>{
						let finalResult = (result && result.length > NOT) ? result[0] :{};
					 	finalResult['current_page'] = page;
						callback(err, finalResult);
					});
				},
				(callback)=>{
					/** user services */
					collection.aggregate([
		                {$match: {_id : ObjectId(id)}},
		                {$lookup:{
		                    from: "users",
		                    let: { userId: "$user_id" },
		                    pipeline: [
		                      	{$match: {
			                        $expr: {
			                          $and: [
			                            { $eq: ["$_id", "$$userId"] },
			                          ],
			                        },
		                      	}},
				                {$project:{
				                	_id :1, services:1
				                }},
		                    ],
		                    as: "userDetail",
		                }},
		              
		                {$project:{
		               		_id :1, services : {'$arrayElemAt': ["$userDetail.services",0]},
		             	}},
		            ]).toArray((err, result)=>{
		            	let services = (result && result.length > NOT) ? result[0]['services'] : [];
		            	callback(err, services);
					});
				},
				(callback)=>{
					/** Correctness of each category*/
					collection.aggregate([
		                {$match: {_id : ObjectId(id)}},
		                {$unwind : '$exam_questions'},
		                {$lookup:{
			              	from: "categories",
			              	let: { categoryId: "$exam_questions.category"},
			              	pipeline: [
			                 	{$match: {
			                    	$expr: {
				                      	$and: [
				                        	{ $eq: ["$_id", "$$categoryId"] },
				                      	],
			                    	},
			                 	}},
			              	],
			              	as: "categoryIdDetail",
			          	}},
			          	{$group:{
			       			_id        		: '$exam_questions.category', 
			       			category   		: { $first: {'$arrayElemAt': ["$categoryIdDetail.name",0]}},
			       			correct_avg   : {
					            "$avg": { "$cond": [
					                // { "$eq": [ "$exam_questions.correct_answer", '$exam_questions.user_answer'] },
					                // 1,
					                // 0

					                { '$or': [
						                { '$and': [ 
							            	{ "$eq": [ "$exam_questions.question_type", MULTIPLE_CHOICE_QUESTION] }, 
							            	{ "$eq": [ "$exam_questions.correct_answer", '$exam_questions.user_answer']} ]	
							            },
							            { '$and': [ 
							            	{ "$eq": [ "$exam_questions.question_type", INPUT_TYPE_QUESTION] }, 
							            	{ "$eq": [ "$exam_questions.correct_answer", ACTIVE]} ]	
							            }
								    ]},
						            1,
						            0
					            ]}
					        }
				      	}},
				      	{$project:{
			       			_id   		: 1, 
			       			category  	: 1,
			       			percentage	: {"$ceil" : {"$multiply": [ "$correct_avg", 100 ]} },
				       		
				      	}}
		            ]).toArray((err, result)=>{
		            	let categories = (result && result.length > NOT) ? result : [];
		            	callback(err, categories);
					});
				},
				(callback)=>{
					/** Overall Correctness*/
					collection.aggregate([
		                {$match: {_id : ObjectId(id)}},
		                {$unwind : '$exam_questions'},
			          	{$group:{
			       			_id        		: '$_id', 
			       			correct_avg   : {
					            "$avg": { "$cond": [
					                // { "$eq": [ "$exam_questions.correct_answer", '$exam_questions.user_answer'] },
					                // 1,
					                // 0

					                { '$or': [
						                { '$and': [ 
							            	{ "$eq": [ "$exam_questions.question_type", MULTIPLE_CHOICE_QUESTION] }, 
							            	{ "$eq": [ "$exam_questions.correct_answer", '$exam_questions.user_answer']} ]	
							            },
							            { '$and': [ 
							            	{ "$eq": [ "$exam_questions.question_type", INPUT_TYPE_QUESTION] }, 
							            	{ "$eq": [ "$exam_questions.correct_answer", ACTIVE]} ]	
							            }
								    ]},
						            1,
						            0
					            ]}
					        },
					        wrong_avg   : {
					            "$avg": { "$cond": [
					                // { "$ne": [ "$exam_questions.correct_answer", '$exam_questions.user_answer'] },
					                // 1,
					                // 0

					                { '$or': [
						                { '$and': [ 
							            	{ "$eq": [ "$exam_questions.question_type", MULTIPLE_CHOICE_QUESTION] }, 
							            	{ "$ne": [ "$exam_questions.correct_answer", '$exam_questions.user_answer']} ]	
							            },
							            { '$and': [ 
							            	{ "$eq": [ "$exam_questions.question_type", INPUT_TYPE_QUESTION] }, 
							            	{ "$ne": [ "$exam_questions.correct_answer", ACTIVE]} ]	
							            }
								    ]},
						            1,
						            0
					            ]}
					        },
					        unanswered_avg   : {
					            "$avg": { "$cond": [
					                { "$ne": [ "$exam_questions.is_answer", ACTIVE] },
					                1,
					                0
					            ]}
					        }
				      	}},
				      	{$project:{
			       			_id  : 1, 
			       			correct		: {"$multiply": [ "$correct_avg", 100 ]},
				       		wrong		: {"$multiply": [ "$wrong_avg", 100 ]},
				       		unanswered	: {"$multiply": [ "$unanswered_avg", 100 ]},
				      	}}
		            ]).toArray((err, result)=>{
		            	let correctness = (result && result.length > NOT) ? result[0] : {};
		            	callback(err, correctness);
					});
				}
			],
			(err, response)=>{
				if(err) return next(err);

				/** Render result page **/
				req.breadcrumbs(BREADCRUMBS['admin/examinations/result']);
				res.render('result',{
					result					: 	(response[0]) ? response[0] : {},
					user_services			: 	(response[1]) ? response[1] : [],
					category_correctness	: 	(response[2]) ? response[2] : [],
					overall_correctness		: 	(response[3]) ? response[3] : {},
				});
			});
		}	
			
	};//End viewResult()

	/**
	 * Function to get question detail
	 *
	 * @param req 	As 	Request Data
	 * @param res 	As 	Response Data
	 * @param next 	As 	Callback argument to the middleware function
	 *
	 * @return render/json
	 */
	this.viewQuestions = (req, res,next)=>{
			/** Get exam details **/
			let id = (req.params.id) ? req.params.id : "";
			let examinations = db.collection("examinations");
			examinations.findOne({_id : ObjectId(id)},(error,result)=>{
				if(error) return next(error)

				/** Render view page **/
				req.breadcrumbs(BREADCRUMBS['admin/examinations/view']);
				res.render('view',{
					result	: 	result,
				});
			});
	};//End viewQuestions()



	/**
	 * Function for generate exam link
	 *
	 * @param req 	As	Request Data
	 * @param res 	As	Response Data
	 * @param next 	As 	Callback argument to the middleware function
	 *
	 * @return render/json
	 */
	this.generateExamLink = (req, res,next)=>{
		let userId  = (req.params.id) ? req.params.id : '';
		if(isPost(req)){
			/** Sanitize Data */
			req.body 		= 	sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);
			let timeDuration= 	(req.body.time_duration)? 	req.body.time_duration 	:"";
			let level		= 	(req.body.level) 	? 	req.body.level :{};
			let subject 	= 	(req.body.subject) 	? 	req.body.subject :{};
			let name 		= 	(req.body.name) 	? 	req.body.name :[];
			let description = 	(req.body.description) 	? 	req.body.description :"";
			let levelId 	= 	(level && Object.keys(level).length > NOT)?  level.split(",")[0] : "";
			let levelName 	= 	(level && Object.keys(level).length > NOT)?  level.split(",")[1] : "";
			let subjectId 	= 	(subject && Object.keys(subject).length > NOT)?  subject.split(",")[0] : "";
			let subjectName	= 	(subject && Object.keys(subject).length > NOT)?  subject.split(",")[1] : "";

			/** Check validation */
			req.checkBody({
				'name': {
					notEmpty: true,
					errorMessage: res.__("admin.examinations.please_enter_name")
				},
				'time_duration': {
					notEmpty: true,
					isInt		:{
						options    : {min : EXAM_MIN_DURATION , max : EXAM_MAX_DURATION},
						errorMessage:res.__("admin.examinations.invalid_time_duration")
					},
					errorMessage: res.__("admin.examinations.please_enter_duration_time")
				},
				'level': {
					notEmpty: true,
					errorMessage: res.__("admin.examinations.please_select_level")
				},
				'subject': {
					notEmpty: true,
					errorMessage: res.__("admin.examinations.please_select_subject")
				},
				'description': {
					notEmpty: true,
					errorMessage: res.__("admin.examinations.please_enter_description")
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

			description.replace(new RegExp(/&nbsp;|<br \/\>|<p>|<\/p>/g),' ').trim();
			let questions = db.collection('questions');
			questions.aggregate([
                {$match: {
					'is_deleted'    : NOT_DELETED,
                	'level._id'  	: ObjectId(levelId),
					'subject._id'  	: ObjectId(subjectId),
                }},
				{$sample:{size : EXAM_QUIZ_LIMIT}},
                {$project: {question : 1, options :1, correct_answer :1}}
            ]).collation(COLLATION_VALUE).toArray((err, result)=>{
            	if(err) return next(err);
            	result = (result && result.length > NOT) ? result : [];

            	/** Set Questions**/
            	let examQuestions = []
            	asyncforEachOf(result,(records, index, callback)=>{
            		examQuestions.push(records); 
					callback(null);
				},asyncErr=>{

					/** No question found */
	            	if(examQuestions.length == NOT){
						/** Send error response */
						return res.send({
							status	: STATUS_ERROR,
							message	: [{'param':'no_question','msg':res.__("admin.examinations.questions_are_not_available")}],
						});
	            	}

					/** Save exam question details */
					let examinations = db.collection('examinations');
					examinations.insertOne({
						name                :  	name,
						level				:	{_id : ObjectId(levelId), name : levelName},
						subject				: 	{_id : ObjectId(subjectId), name : subjectName},
						description         : 	description,
						time_duration       : 	Number(timeDuration),
						exam_questions      :   examQuestions,
						created 			: 	getUtcDate(),
						modified 			: 	getUtcDate()
					},(err,result)=>{
						if(err) return next(err);

						/** Send success response */
						req.flash(STATUS_SUCCESS,res.__("admin.examinations.a_new_exam_has_been_created_successfully"));
						res.send({
							status			: STATUS_SUCCESS,
							redirect_url	: WEBSITE_ADMIN_URL+'examinations',
							message			: res.__("admin.examinations.a_new_exam_has_been_created_successfully")
						});		
					});
				});
            })
		}else{

			/** Get all expert list*/
			let options = {
				collections		: [
					{
						collection : 'masters',
						columns    : ['_id' ,'name'],
						conditions : {dropdown_type: 'level', status : ACTIVE},
						selected   : []
					}
				]
			};

			getDropdownList(req,res,next,options).then(levelList=>{
				if(levelList.status == STATUS_ERROR){
					/** Send error response **/
					req.flash(STATUS_ERROR,response.message);
					res.redirect(WEBSITE_ADMIN_URL);
					return;
				}

				req.breadcrumbs(BREADCRUMBS['admin/examinations/add']);
				/**Render on exam add page */
				res.render('add',{	
					level_list    	:   (levelList.final_html_data) ? levelList.final_html_data['0'] : '',
				});
			}).catch(next);
		}
	};//End generateExamLink()


    /**
     * Function for update question's answer
     *
     * @param req   As Request Data
     * @param res   As Response Data
     * @param next  As  Callback argument to the middleware function
     *
     * @return null
     */
    this.updateQuestionAnswer = (req,res,next)=>{
        let examId      	= (req.params.exam_id)      ? req.params.exam_id  : "";
        let questionId      = (req.params.question_id)  ? req.params.question_id : "";

        /** Update question status*/
        const examinations = db.collection("examinations");
        examinations.findOneAndUpdate(
        	{
	        	_id : ObjectId(examId), 
	        	exam_questions: { $elemMatch: { _id: ObjectId(questionId)} }
	        },
	        {$set :{
	        	"modified" : getUtcDate(),
	        	"exam_questions.$.correct_answer" : ACTIVE,
	        	"exam_questions.$.modified" : getUtcDate()
	        }},(err,result)=>{
	            if(err) return next(err);

	            /** Send success response **/
	            req.flash(STATUS_SUCCESS,res.__("admin.examination.answer_has_been_updated_successfully"));
	            res.redirect(WEBSITE_ADMIN_URL+"examinations/result/"+examId);
        	}
        );
    };//End updateQuestionAnswer()


    /**
     * Function for share result with user
     *
     * @param req   As Request Data
     * @param res   As Response Data
     * @param next  As  Callback argument to the middleware function
     *
     * @return null
     */
    this.shareResult = (req,res,next)=>{
        let userId      	= (req.params.user_id)      ? req.params.user_id  : "";
        let resultType      = (req.params.result)      ? req.params.result  : DEACTIVE;

        /** get user email to share result*/
        const collection = db.collection("users");
        collection.findOne(
        	{
	        	_id 		: ObjectId(userId),
	        	is_deleted  : NOT_DELETED,
	        	is_approved : SEARCHING_APPROVED
	        },
	        {projection: {
	        	email : 1, full_name:1, is_approved :1
	        }},(err,result)=>{
	            if(err) return next(err);

            	/** Set email option and send mail*/
            	let actionResult = (resultType == ACTIVE) ? 'exam_passed' : 'exam_failed';
	          	let emailOptions = {
	            	action      : actionResult,
	            	to          : result.email,
	            	rep_array   : [result.full_name]
	          	};
	          	sendEmail(req, res,emailOptions);

	            /** redirect **/
	            req.flash(STATUS_SUCCESS,res.__("admin.examination.result_has_been_shared_with_user"));
	            res.redirect(WEBSITE_ADMIN_URL+"examinations");
        	}
        );
    };//End shareResult()
}
module.exports = new Examinations();
