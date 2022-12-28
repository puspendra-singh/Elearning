const asyncParallel	= require("async/parallel");
const asyncEach		= require("async/each");
const clone 		= require("clone");

function AdminModule() {

	const AdminModules = this;

	/**
	 * Function to get Admin Modules list
	 *
	 * @param req As Request Data
	 * @param res As Response Data
	 *
	 * @return render/json
	 */
	this.list = (req, res)=>{
		if(isPost(req)){
			let limit			= 	(req.body.length)	? 	parseInt(req.body.length)	: ADMIN_LISTING_LIMIT;
			let skip			= 	(req.body.start) 	?	parseInt(req.body.start)	: DEFAULT_SKIP;
			const collection	=	db.collection('admin_modules');

			/** Configure Datatable conditions*/
			configDatatable(req,res,null).then(dataTableConfig=>{
				asyncParallel([
					(callback)=>{
						/** Default sorting **/
						if(dataTableConfig.sort_conditions && typeof dataTableConfig.sort_conditions["_id"] !== typeof undefined){
							dataTableConfig.sort_conditions = {parent_order : SORT_ASC,parent_id:SORT_ASC,order:SORT_ASC};
						}

						/** Get list of admin module **/
						collection.aggregate([
							{$match	 : dataTableConfig.conditions},
							{$lookup : {
								"from" 			: "admin_modules",
								"localField"	: "parent_id",
								"foreignField"	: "_id",
								"as" 			: "parent_detail"
							}},
							{$project :	{
								id:1,title:1,parent_id:1,is_active:1,order:1,modified:1,parent_name:{$arrayElemAt : ["$parent_detail.title",0]},
								parent_order: {$cond: {if: {$eq: ["$parent_id", 0]}, then: '$order', else: {$arrayElemAt:["$parent_detail.order",0]}}},
							}},
							{$sort  : dataTableConfig.sort_conditions},
							{$skip 	: skip},
							{$limit : limit},
						]).toArray((err, result)=>{
							callback(err,result);
						});
					},
					(callback)=>{
						/** Get total number of records in admin module collection **/
						collection.countDocuments({},(err,countResult)=>{
							callback(err, countResult);
						});
					},
					(callback)=>{
						/** Get filtered records counting in admin module **/
						collection.countDocuments(dataTableConfig.conditions,(err,filterContResult)=>{
							callback(err,filterContResult);
						});
					}
				],(err, response)=>{
					/** Send response **/
					res.send({
						status			: (!err) ? STATUS_SUCCESS 		:STATUS_ERROR,
						draw			: dataTableConfig.result_draw,
						data			: (response[0]) ? response[0]	:[],
						recordsTotal	: (response[1]) ? response[1] 	:0,
						recordsFiltered	: (response[2]) ? response[2]	:0
					});
				});
			});
		}else{
			/** render listing page **/
			req.breadcrumbs(BREADCRUMBS['admin/admin_modules/list']);
			res.render('list');
		}
	};//End list()

	/**
	 * Function for add admin module
	 *
	 * @param req As Request Data
	 * @param res As Response Data
	 *
	 * @return render/json
	 */
   	this.add = (req, res)=>{
		if(isPost(req)){
			/** Sanitize Data **/
			req.body = sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);

			/** Check validation **/
			req.checkBody({
				"title":{
					notEmpty: true,
					errorMessage: res.__("admin.admin_module.please_enter_title")
				},
				"path":{
					notEmpty: true,
					errorMessage: res.__("admin.admin_module.please_enter_path")
				},
				"group_path":{
					notEmpty: true,
					errorMessage: res.__("admin.admin_module.please_enter_group_path")
				},
				"order":{
					notEmpty: true,
					errorMessage: res.__("admin.admin_module.please_enter_order"),
					isNumeric:{
						errorMessage: res.__("admin.admin_module.order_must_be_numeric")
					},
					matches: {
						options: [/^(0*[1-9][0-9]*)$/],
						errorMessage: res.__("admin.admin_module.order_must_be_greater_then_0")
					},
				},
			});

			/**parse validation array  **/
			let errors = parseValidation(req.validationErrors(),req);
			if(!errors){
				try{
					let title		= (req.body.title)		? req.body.title			: "";
					let path 		= (req.body.path)		? req.body.path				: "";
					let groupPath	= (req.body.group_path)	? req.body.group_path		: "";
					let icon		= (req.body.icon)		? req.body.icon	 			: "";
					let order		= (req.body.order)		? req.body.order	 		: "";
					let parentId	= (req.body.parent)		? ObjectId(req.body.parent)	: 0;

					/** Configure order unique condition*/
					const admin_modules = db.collection("admin_modules");
					admin_modules.findOne({
							parent_id	: parentId,
							order 		: parseInt(order),
						},
						{projection: {
							order:1,
						}},(err, result)=>{
							if(!result){
								admin_modules.insertOne({
										title 		: title,
										path 		: path,
										group_path	: groupPath,
										icon 		: icon,
										parent_id	: parentId,
										order 		: parseInt(order),
										is_active	: ACTIVE,
										created		: getUtcDate(),
										modified	: getUtcDate(),
									},(error,qryResult)=>{
										if(!error){
											/** Delete Modules list **/
											myCache.del( "admin_modules_list" );

											/** Send success response **/
											req.flash(STATUS_SUCCESS,res.__("admin.admin_module.admin_module_has_been_added_successfully"));
											res.send({
												status			: STATUS_SUCCESS,
												redirect_url	: WEBSITE_ADMIN_URL+"admin_modules",
												message			: res.__("admin.admin_module.admin_module_has_been_added_successfully")
											});
										}else{
											/** Send error response **/
											res.send({
												status	: STATUS_ERROR,
												message	: [{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again")}],
											});
										}
									}
								);
							}else{
								/** Send error message*/
								res.send({
									status	: STATUS_ERROR,
									message	: [{param:'order',msg:res.__("admin.admin_module.order_is_already_exist")}]
								});
							}
						}
					);
				}catch(e){
					/** Send error response **/
					res.send({
						status	: STATUS_ERROR,
						message	: [{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again")}]
					});
				}
			}else{
				/** Send error response **/
				res.send({
					status	: STATUS_ERROR,
					message	: errors,
				});
			}
		}else{
			getAdminModulesList(req, res).then((response)=>{
				if(response.status == STATUS_SUCCESS){
					/** Render add page  **/
					req.breadcrumbs(BREADCRUMBS['admin/admin_modules/add']);
					res.render('add',{
						result	: (response.result) ? response.result : "",
					});
				}else{
					/** Send error response **/
					req.flash(STATUS_ERROR,response.message);
					res.redirect(WEBSITE_ADMIN_URL+'admin_modules');
				}
			});
		}
	};//End add()

	/**
	 * Function for edit admin module
	 *
	 * @param req As Request Data
	 * @param res As Response Data
	 *
	 * @return render/json
	 */
	this.edit = (req, res)=>{
		let moduleId = (req.params.id)	? req.params.id	: "";
		if(moduleId && moduleId != ""){
			if(isPost(req)){
				/** Sanitize Data **/
				req.body = sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);

				/** Check validation **/
				req.checkBody({
					"title":{
						notEmpty: true,
						errorMessage: res.__("admin.admin_module.please_enter_title")
					},
					"path":{
						notEmpty: true,
						errorMessage: res.__("admin.admin_module.please_enter_path")
					},
					"group_path":{
						notEmpty: true,
						errorMessage: res.__("admin.admin_module.please_enter_group_path")
					},
					"order":{
						notEmpty: true,
						errorMessage: res.__("admin.admin_module.please_enter_order"),
						isNumeric:{
							errorMessage: res.__("admin.admin_module.order_must_be_numeric")
						},
						matches: {
							options: [/^(0*[1-9][0-9]*)$/],
							errorMessage: res.__("admin.admin_module.order_must_be_greater_then_0")
						},
					}
				});

				/** parse Validation array  **/
				let errors = parseValidation(req.validationErrors(),req);
				if(!errors){
					try{
						let title 		= (req.body.title)		? req.body.title			: "";
						let path 		= (req.body.path)		? req.body.path				: "";
						let groupPath 	= (req.body.group_path)	? req.body.group_path		: "";
						let icon		= (req.body.icon)		? req.body.icon	 			: "";
						let order		= (req.body.order)		? req.body.order	 		: "";
						let parentId	= (req.body.parent)		? ObjectId(req.body.parent)	: 0;

						/** update  admin module data*/
						const admin_modules = db.collection('admin_modules');
						admin_modules.findOne(
							{
								_id			: {$ne :ObjectId(moduleId)},
								parent_id	: parentId,
								order		: parseInt(order)
							},
							{projection: {
								_id:1,order:1,
							}},(err, result)=>{
								if(!result){
									admin_modules.updateOne({
										_id : ObjectId(moduleId)
									},
									{$set: {
										title 		: title,
										path		: path,
										group_path 	: groupPath,
										icon 		: icon,
										parent_id 	: parentId,
										order 		: parseInt(order),
										modified 	: getUtcDate()
									}},(updateErr,updateResult)=>{
										if(!updateErr){
											/** Delete Modules list **/
											myCache.del( "admin_modules_list" );

											/** Send success response **/
											req.flash(STATUS_SUCCESS,res.__("admin.admin_module.admin_modules_details_updated_successfully"));
											res.send({
												status		 : STATUS_SUCCESS,
												redirect_url : WEBSITE_ADMIN_URL+'admin_modules',
												message		 : res.__("admin.admin_module.admin_modules_details_updated_successfully")
											});
										}else{
											/** Send error response **/
											res.send({
												status : STATUS_ERROR,
												message: [{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again")}]
											});
										}
									});
								}else{
									/** Send error response **/
									res.send({
										status : STATUS_ERROR,
										message: [{param:'order',msg:res.__("admin.admin_module.order_is_already_exist")}]
									});
								}
							}
						);
					}catch(e){
						/** Send error response **/
						res.send({
							status : STATUS_ERROR,
							message: [{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again")}]
						});
					}
				}else{
					/** Send error response **/
					res.send({
						status	: STATUS_ERROR,
						message	: errors,
					});
				}
			}else{
				asyncParallel([
					(callback)=>{
						getAdminModulesList(req, res).then((parentResponse)=>{
							if(parentResponse.status == STATUS_SUCCESS){
								callback(null,parentResponse.result);
							}else{
								callback(STATUS_ERROR,parentResponse);
							}
						});
					},
					(callback)=>{
						getAdminModuleDetails(req, res).then(response=>{
							if(response.status == STATUS_SUCCESS){
								callback(null,response.result);
							}else{
								callback(STATUS_ERROR,response);
							}
						});
					}
				],(err,response)=>{
					if(!err){
						/** Render edit page  **/
						req.breadcrumbs(BREADCRUMBS['admin/admin_modules/edit']);
						res.render('edit',{
							parentResult	: (response[0]) ? response[0]: [],
							result			: (response[1]) ? response[1]: [],
						});
					}else{
						/** Send error response **/
						req.flash(STATUS_ERROR,response.message);
						res.redirect(WEBSITE_ADMIN_URL+'admin_modules');
					}
				});
			}
		}else{
			/** Send error response **/
			req.flash(STATUS_ERROR,res.__("admin.system.invalid_access"));
			res.redirect(WEBSITE_ADMIN_URL+"admin_modules");
		}
	};//End edit()

	/**
	 * Function for get Admin Module Details
	 *
	 * @param req As Request Data
	 * @param res As Response Data
	 *
	 * @return json
	 */
	let getAdminModuleDetails = (req,res)=>{
		return new Promise(resolve=>{
			let id	= (req.params.id)	? req.params.id	: "";
			if(!id || id ==''){
				let response = {
					status	: STATUS_ERROR,
					message	: res.__("admin.system.invalid_access")
				};
				resolve(response);
			}else{
				try{
					/** Get admin module details **/
					const admin_modules = db.collection('admin_modules');
					admin_modules.findOne({
							_id : ObjectId(id)
						},
						{projection: {
							_id:1,title:1,path:1,order:1,group_path:1,icon:1,is_active:1,modified:1,parent_id:1,
						}},(err, result)=>{
							if(result){
								let response = {
									status	: STATUS_SUCCESS,
									result	: result,
								};
								resolve(response);
							}else{
								/** Send error response **/
								let response = {
									status	: STATUS_ERROR,
									message	: res.__("admin.system.something_going_wrong_please_try_again")
								};
								resolve(response);
							}
						}
					);
				}catch(e){
					/** Send error response **/
					let response = {
						status	: STATUS_ERROR,
						message	: res.__("admin.system.something_going_wrong_please_try_again")
					};
					resolve(response);
				}
			}
		});
	};//End getAdminModuleDetails();

	/**
	 * Function for update order value
	 *
	 * @param req As Request Data
	 * @param res As Response Data
	 *
	 * @return null
	 */
	this.changeOrderValue = (req,res)=>{
		/** Sanitize Data **/
		req.body 		= sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);
		let moduleId	= (req.body.id) 		? (req.body.id)	 		:"";
		let order		= (req.body.new_order) 	? (req.body.new_order)	:"";
		let parentId	= (req.body.parent_id && req.body.parent_id!=0)	? ObjectId(req.body.parent_id)	: 0;
		if(moduleId){
			/** Check validation **/
			req.checkBody({
				"new_order":{
					notEmpty: true,
					errorMessage: res.__("admin.admin_module.please_enter_order"),
					isNumeric:{
						errorMessage: res.__("admin.admin_module.order_must_be_numeric")
					},
					matches: {
						options: [/^(0*[1-9][0-9]*)$/],
						errorMessage: res.__("admin.admin_module.order_must_be_greater_then_0")
					},
				}
			});

			/** parse Validation array  **/
			let errors = parseValidation(req.validationErrors(),req);
			if(!errors){
				try{
					const admin_modules = db.collection('admin_modules');
					admin_modules.findOne({
							_id   		: 	{$ne :ObjectId(moduleId)},
							parent_id	:	parentId,
							order 		:	parseInt(order),
						},
						{projection: {
							_id:1,order:1,
						}},(err, result)=>{
							if(!result){
								admin_modules.updateOne({
										_id : ObjectId(moduleId)
									},
									{$set : {
										order		: parseInt(order),
										modified 	: getUtcDate()
									}},(uppdateErr,updateResult)=>{
										if(!uppdateErr){

											/** Delete Modules list **/
											myCache.del( "admin_modules_list" );

											/** Send success response **/
											res.send({
												status	: STATUS_SUCCESS,
												message	: res.__("admin.admin_module.order_updated_successfully"),
											});
										}else{
											/** Send Error response **/
											res.send({
												status	: STATUS_ERROR,
												message	: res.__("admin.system.something_going_wrong_please_try_again"),
											});
										}
									}
								);
							}else{
								/** Send error response **/
								res.send({
									status : STATUS_ERROR,
									message: res.__("admin.admin_module.order_is_already_exist")
								});
							}
						}
					);
				}catch(e){
					/** Send error response **/
					res.send({
						status	: STATUS_ERROR,
						message	: res.__("admin.system.something_going_wrong_please_try_again")
					});
				}
			}else{
				/** Send error response **/
				res.send({
					status	: STATUS_ERROR,
					message	: (errors[0] && errors[0].msg) ? errors[0].msg : "",
				});
			}
		}else{
			/** Send error response **/
			res.send({
				status	: STATUS_ERROR,
				message	: res.__("admin.system.invalid_access")
			});
		};
	};//End changeOrderValue()

	/**
	 * Function for update admin module status
	 *
	 * @param req As Request Data
	 * @param res As Response Data
	 *
	 * @return null
	 */
	this.updateAdminModuleStatus  = (req, res)=>{
		try{
			let moduleId = (req.params.id) ? req.params.id : "";
			let status	 = (req.params.status==ACTIVE) ? DEACTIVE : ACTIVE;
			if(moduleId){
				const admin_modules = db.collection('admin_modules');
				admin_modules.updateMany({
						$or: [
							{_id 		: ObjectId(moduleId)},
							{parent_id	: ObjectId(moduleId)}
						]
					},
					{$set : {
						is_active	: status,
						modified 	: getUtcDate()
					}},(err,result)=>{
						if(!err){
							/** Delete Modules list **/
							myCache.del( "admin_modules_list" );

							/** Send success response **/
							req.flash(STATUS_SUCCESS,res.__("admin.admin_module.admin_modules_status_updated_successfully"));
							res.redirect(WEBSITE_ADMIN_URL+'admin_modules');
						}else{
							/** Send error response **/
							req.flash(STATUS_ERROR,res.__("admin.system.something_going_wrong_please_try_again"));
							res.redirect(WEBSITE_ADMIN_URL+'admin_modules');
						}
					}
				);
			}else{
				/** Send error response **/
				req.flash(STATUS_ERROR,res.__("admin.system.invalid_access"));
				res.redirect(WEBSITE_ADMIN_URL+'admin_modules');
			}
		}catch(e){
			/** Send error response **/
			req.flash(STATUS_ERROR,res.__("admin.system.something_going_wrong_please_try_again"));
			res.redirect(WEBSITE_ADMIN_URL+'admin_modules');
		}
	};// end updateAdminModuleStatus()

	/**
	 * Function to get Admin Module list
	 *
	 * @param req As Request Data
	 * @param res As Response Data
	 *
	 * @return json
	 */
	let	getAdminModulesList = (req,res)=>{
		return new Promise(resolve=>{
		 	try{
				/** Get admin modules details **/
				const admin_modules = db.collection('admin_modules');
				admin_modules.find({parent_id : 0},{projection: {_id:1,title:1,}}).collation(COLLATION_VALUE).sort({"order":1}).toArray((err,result)=>{
					if(result){
						/** Send success response **/
						let response = {
							status	: STATUS_SUCCESS,
							result	: result
						};
						resolve(response);
					}else{
						/** Send error response */
						let response = {
							status	: STATUS_ERROR,
							result	: [],
							message	: res.__("admin.system.something_going_wrong_please_try_again")
						};
						resolve(response);
					}
				});
			}catch(e){
				/** Send error response */
				let response = {
					status	: STATUS_ERROR,
					result	: [],
					message	: res.__("admin.system.something_going_wrong_please_try_again")
				};
				resolve(response);
			}
		});
	};//End getAdminModulesList()

	/**
	 * Function for delete admin module
	 *
	 * @param req As Request Data
	 * @param res As Response Data
	 *
	 * @return null
	 */
	this.delete = (req, res)=> {
		let moduleId = (req.params.id) ? req.params.id : '';
		if(moduleId){
			try{
				/** Delete admin module*/
				const admin_modules	= db.collection('admin_modules');
				admin_modules.deleteMany({
						$or: [
							{_id 		: ObjectId(moduleId)},
							{parent_id	: ObjectId(moduleId)}
						]
					},(err,result)=>{
						if(!err){
							/** Delete Modules list **/
							myCache.del( "admin_modules_list" );
							/** Send success response **/
							req.flash(STATUS_SUCCESS,res.__("admin.admin_module.admin_module_has_been_deleted_successfully"));
							res.redirect(WEBSITE_ADMIN_URL+"admin_modules");
						}else{
							/** Send error response **/
							req.flash(STATUS_ERROR,res.__("admin.system.something_going_wrong_please_try_again"));
							res.redirect(WEBSITE_ADMIN_URL+"admin_modules");
						}
					}
				);
			}catch(e){
				/** Send error response **/
				req.flash(STATUS_ERROR,res.__("admin.system.something_going_wrong_please_try_again"));
				res.redirect(WEBSITE_ADMIN_URL+"admin_modules");
			}
		}else{
			/** Send error response **/
			req.flash(STATUS_ERROR,res.__("admin.system.invalid_access"));
			res.redirect(WEBSITE_ADMIN_URL+"admin_modules");
		}
	};//End delete()

	/**
	 * Function to get admin modules array to use in roles and permission
	 *
	 * @param req As Request Data
	 * @param res As Response Data
	 *
	 * @return json
	 */
    this.getAdminModulesTree = (req, res)=>{
		return new Promise(resolve=>{
			try{
				const admin_modules	= db.collection('admin_modules');
				admin_modules.aggregate([
					{$match	 : {is_active : ACTIVE}},
					{$lookup : {
						"from" 			: "admin_modules",
						"localField"	: "parent_id",
						"foreignField"	: "_id",
						"as" 			: "parent_detail"
					}},
					{$addFields	: {parent_order: {$cond: {if: {$eq: [ "$parent_id", 0]}, then: '$order', else: {"$arrayElemAt" : ["$parent_detail.order",0]} } }}},
					{$project 	: {parent_detail : 0 }},
					{$sort  	: {parent_order : SORT_ASC,parent_id : SORT_ASC,order : SORT_ASC}}
				]).toArray((err, result)=>{
					if(!err && result){
						if(result.length > 0){
							let moduleArray = {};

							asyncEach(result,(module, parentCallback)=>{
								let moduleId	= (module._id) 			? module._id 		: "";
								let parentId	= (module.parent_id) 	? module.parent_id 	: 0;

								let detail 				= clone(module);
								detail["id"] 			= String(moduleId);
								detail["parent_id"] 	= String(parentId);
								detail["name"] 			= (module.title) ? String(module.title) : "";

								if(parentId == 0){
									let childs		= [];
									if(moduleArray[moduleId] && moduleArray[moduleId]['childs']){
										childs = moduleArray[moduleId]['childs'];
									}
									detail["childs"] 		= childs;
									moduleArray[moduleId] 	= detail;
								}else{
									if(!moduleArray[parentId]){
										moduleArray[parentId] = {};
									}
									if(!moduleArray[parentId]["childs"]){
										moduleArray[parentId]["childs"] = [];
									}
									moduleArray[parentId]["childs"].push(detail);
								}
								parentCallback(null);
							},(parentErr)=>{
								let response = {
									status : STATUS_SUCCESS,
									result : (moduleArray) ? Object.values(moduleArray) : []
								};
								resolve(response);
							});
						}else{
							let response = {
								status  : STATUS_SUCCESS,
								result  : []
							};
							resolve(response);
						}
					}else{
						let response = {
							status  : STATUS_ERROR,
							result  : [],
							message : res.__("admin.system.something_going_wrong_please_try_again")
						};
						resolve(response);
					}
				});
			}catch(e){
				let response = {
					status  : STATUS_ERROR,
					result  : [],
					message : res.__("admin.system.something_going_wrong_please_try_again")
				};
				resolve(response);
			}
		});
	};//End getAdminModulesTree()

	/**
	 * Function to change format of module ids array
	 *
	 * @param req As Request Data
	 * @param res As Response Data
	 *
	 * @return null
	 */
    this.formatModuleIdsArray = (req,res)=>{
        return new Promise(resolve=>{
            let modules   = (req.body.module_ids)	? req.body.module_ids	: {};
            if(typeof modules !== typeof undefined && modules){
                if(Object.keys(modules).length > 0){
                    let selectedModuleObjectIds = Object.keys(modules).map(records=>{
                        return (records) ? ObjectId(records) : "";
                    });

                    const admin_modules = db.collection("admin_modules");
					admin_modules.aggregate([
						{$match:{ _id : {$in : selectedModuleObjectIds}}},
						{$lookup : {
							"from" 			: "admin_modules",
							"localField"	: "_id",
							"foreignField"	: "parent_id",
							"as" 			: "child_detail"
						}},
						{$project 	: {
							_id:1, group_path:1, parent_id:1,
							childs: {"$size" : ["$child_detail"]}
						}},
					]).toArray((err, result)=>{
                        if(!err && result){
                            resolve(result);
                        }else{
                            resolve([]);
                        }
                    });
                }else{
                    resolve([]);
                }
            }else{
                resolve([]);
            }
        });
	};//End formatModuleIdsArray()

	this.getAdminModulesListing = (req, res)=>{
		return new Promise(resolve=>{
			try{
				let userId	= (req.session.user._id) 	? req.session.user._id : "";
				const users	= db.collection("users");
				users.findOne({
					_id 		: ObjectId(userId),
					is_deleted 	: NOT_DELETED
				},{projection: {
					user_role_id:1,module_ids:1
				}},(userErr,userResult)=>{
					if(!userErr && userResult){
						let userRoleId	= (userResult.user_role_id) ? userResult.user_role_id : "";
						let moduleLists	= (userResult.module_ids) 	? userResult.module_ids : [];
						let moduleIds	= moduleLists.map(moduleList=>{
							let moduleId = (moduleList._id) ? String(moduleList._id) : "";
							return moduleId;
						});

						const admin_modules	= db.collection('admin_modules');
						admin_modules.aggregate([
							{$match	 : {is_active : ACTIVE}},
							{$lookup : {
								"from" 			: "admin_modules",
								"localField"	: "parent_id",
								"foreignField"	: "_id",
								"as" 			: "parent_detail"
							}},
							{$project 	: { parent_order: { $cond: { if: { $eq: [ "$parent_id", 0 ] }, then: '$order', else: {"$arrayElemAt" : ["$parent_detail.order",0]} } },order:1,parent_id:1,title:1,path:1,group_path:1,icon:1 } },
							{$sort  	: { parent_order : 1,parent_id : 1,order : 1}}
						]).toArray((err, result)=>{
							if(!err && result){
								if(result.length > 0){
									let moduleArray = {};
									asyncEach(result,(module, parentCallback)=>{
										let moduleId	= (module._id) 			? module._id 		:"";
										let parentId	= (module.parent_id) 	? module.parent_id 	:0;
										if(moduleIds.indexOf(String(moduleId)) !== -1 || userRoleId == SUPER_ADMIN_ROLE_ID){
											let detail 				= clone(module);

											/** Remove order and parent order and parent id field from array **/
											delete detail['order'];
											delete detail['parent_order'];
											delete detail['parent_id'];

											if(parentId == 0){
												let childs		= [];
												if(moduleArray[moduleId] && moduleArray[moduleId]['childs']){
													childs = moduleArray[moduleId]['childs'];
												}
												detail["childs"] 		= childs;
												moduleArray[moduleId] 	= detail;
											}else{
												if(!moduleArray[parentId]){
													moduleArray[parentId] = {};
												}
												if(!moduleArray[parentId]["childs"]){
													moduleArray[parentId]["childs"] = [];
												}
												moduleArray[parentId]["childs"].push(detail);
											}
											parentCallback(null);
										}else{
											parentCallback(null);
										}
									},(parentErr)=>{
										let response = {
											status : STATUS_SUCCESS,
											result : (moduleArray) ? Object.values(moduleArray) : []
										};
										resolve(response);
									});
								}else{
									let response = {
										status  : STATUS_SUCCESS,
										result  : []
									};
									resolve(response);
								}
							}else{
								let response = {
									status  : STATUS_ERROR,
									result  : [],
									message : res.__("admin.system.something_going_wrong_please_try_again2")
								};
								resolve(response);
							}
						});
					}else{
						let response = {
							status  : STATUS_SUCCESS,
							result  : []
						};
						resolve(response);
					}
				});
			}catch(e){
				let response = {
					status  : STATUS_ERROR,
					result  : [],
					message : res.__("admin.system.something_going_wrong_please_try_again1")
				};
				resolve(response);
			}
		});
	};//End getAdminModulesTree()
}

module.exports = new AdminModule();

