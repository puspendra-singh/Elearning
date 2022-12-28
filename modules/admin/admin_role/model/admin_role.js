const asyncParallel = require("async/parallel");
const adminModule   = require(WEBSITE_ADMIN_MODULES_PATH+"admin_modules/model/admin_module");

function Role() {

	/**
	 * Function for get admin role list
	 *
	 * @param req As Request Data
	 * @param res As Response Data
	 *
	 * @return render/json
	 */
	this.list = (req, res)=>{
		if(isPost(req)){
			let limit			= 	(req.body.length)	?	parseInt(req.body.length)	:ADMIN_LISTING_LIMIT;
			let skip			= 	(req.body.start) 	? 	parseInt(req.body.start)	:DEFAULT_SKIP;
            const collection	= 	db.collection("admin_roles");

			/** Configure Datatable conditions*/
			configDatatable(req,res,null).then((dataTableConfig)=>{
                let commonConditions = {
                    is_shown : SHOWN,
                };
                dataTableConfig.conditions = Object.assign(dataTableConfig.conditions,commonConditions);

				asyncParallel([
					(callback)=>{
						/** Get list of admin roles **/
						collection.find(dataTableConfig.conditions,{projection: {_id:1,role_name:1,modified:1,not_deletable:1}}).collation(COLLATION_VALUE).sort(dataTableConfig.sort_conditions).limit(limit).skip(skip).toArray((err, result)=>{
							callback(err, result);
						});
					},
					(callback)=>{
						/** Get total number of roles in admin_roles collection  **/
						collection.countDocuments(commonConditions,(err,countResult)=>{
							callback(err, countResult);
						});
					},
					(callback)=>{
						/** Get filtered records counting in admin_roles **/
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
						data			: (response[0]) ? response[0] :[],
						recordsTotal	: (response[1]) ? response[1] :0,
						recordsFiltered	: (response[2]) ? response[2] :0,
					});
				});
			});
		}else{
			/** render listing page **/
			req.breadcrumbs(BREADCRUMBS["admin/admin_role/list"]);
			res.render('list');
		}
    };//End list()

    /**
	 * Function for add role
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
            let roleName  = (req.body.role)	? req.body.role	: "";

			/** Check validation **/
			req.checkBody({
				"role": {
					notEmpty: true,
					errorMessage: res.__("admin.admin_role.please_enter_role")
				},
				"module_ids": {
					notEmpty: true,
					errorMessage: res.__("admin.admin_role.please_select_modules")
				}
            });

			/** parse Validation array  **/
			let errors = parseValidation(req.validationErrors(),req);
			if (!errors) {
				try{
                    /** Include admin modules Module **/
                    adminModule.formatModuleIdsArray(req, res).then((moduleArray)=>{
                        const admin_roles	= db.collection("admin_roles");
                        let currentObjectId =   ObjectId();
                        admin_roles.insertOne({
                                _id         : currentObjectId,
                                role_name 	: roleName,
                                role_id 	: String(currentObjectId),
                                module_ids 	: moduleArray,
                                is_shown    : SHOWN,
                                created 	: getUtcDate(),
                                modified 	: getUtcDate()
                            },(error,result)=>{
                                if(!error){
                                    /** Send success response **/
                                    req.flash(STATUS_SUCCESS,res.__("admin.admin_role.role_has_been_added_successfully"));
                                    res.send({
                                        status		: STATUS_SUCCESS,
                                        redirect_url: WEBSITE_ADMIN_URL+"admin_role",
                                        message		: res.__("admin.admin_role.role_has_been_added_successfully")
                                    });
                                }else{
                                    /** Send error response **/
                                    res.send({
                                        status : STATUS_ERROR,
                                        message: [{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again")}],
                                    });
                                }
                            }
                        );
                    });
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
            /** Include admin modules Module **/
            adminModule.getAdminModulesTree(req, res).then((response)=>{
                /** Render view file **/
                req.breadcrumbs(BREADCRUMBS['admin/admin_role/add']);
                res.render('add',{
                    admin_modules : response.result
                });
            });
		}
    };//End add()

    /**
	 * Function for edit role
	 *
	 * @param req As Request Data
	 * @param res As Response Data
	 *
	 * @return render/json
	 */
    this.edit = (req, res)=>{
        let roleId	= (req.params.id) ? req.params.id : "";
		if(roleId){
            if(isPost(req)){
                /** Sanitize Data **/
                req.body 	  = sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);
                let roleName  = (req.body.role)	 ? req.body.role : "";

                /** Check validation **/
                req.checkBody({
                    "role": {
                        notEmpty: true,
                        errorMessage: res.__("admin.admin_role.please_enter_role")
                    },
                    "module_ids": {
                        notEmpty: true,
                        errorMessage: res.__("admin.admin_role.please_select_modules")
                    }
                });

                /** parse Validation array  **/
                let errors = parseValidation(req.validationErrors(),req);
                if (!errors) {
                    try{
                        /** Include admin modules Module **/
                        adminModule.formatModuleIdsArray(req, res).then((moduleArray)=>{
                            const admin_roles	= db.collection("admin_roles");
                            admin_roles.updateOne({
                                    _id : ObjectId(roleId)
                                },
                                {$set: {
                                    role_name 	: roleName,
                                    module_ids 	: moduleArray,
                                    modified 	: getUtcDate()
                                }},(err,result)=>{
                                    if(!err){
                                        /** Send success response **/
                                        req.flash(STATUS_SUCCESS,res.__("admin.admin_role.role_details_updated_successfully"));
                                        res.send({
                                            status		: STATUS_SUCCESS,
                                            redirect_url: WEBSITE_ADMIN_URL+"admin_role",
                                            message		: res.__("admin.admin_role.role_details_updated_successfully")
                                        });
                                    }else{
                                        /** Send error response **/
                                        res.send({
                                            status : STATUS_ERROR,
                                            message: [{param:ADMIN_GLOBAL_ERROR,msg:res.__("admin.system.something_going_wrong_please_try_again")}],
                                        });
                                    }
                                }
                            );
                        });
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
                try{
                    const admin_roles	= db.collection("admin_roles");
                    admin_roles.findOne({
						_id : ObjectId(roleId)
					},
					{projection: {
						_id : 1,role_name :1,module_ids:1
					}},(err,result)=>{
						if(!err && result){
							/** Include admin modules Module **/
							adminModule.getAdminModulesTree(req, res).then((response)=>{
								/** Render view file **/
								req.breadcrumbs(BREADCRUMBS['admin/admin_role/edit']);
								res.render('edit',{
									result          : result,
									admin_modules   : response.result
								});
							});
						}else{
							/** Send error response **/
							req.flash(STATUS_ERROR,res.__("admin.system.something_going_wrong_please_try_again"));
							res.redirect(WEBSITE_ADMIN_URL+"admin_role")
						}
					});
                }catch(e){
                    /** Send error response **/
                    req.flash(STATUS_ERROR,res.__("admin.system.something_going_wrong_please_try_again"));
                    res.redirect(WEBSITE_ADMIN_URL+"admin_role");
                }
            }
        }else{
            /** Send error response **/
            req.flash(STATUS_ERROR,res.__("admin.system.invalid_access"));
            res.redirect(WEBSITE_ADMIN_URL+"admin_role");
        }
    };//End edit()

    /**
	 * Function for delete role
	 *
	 * @param req As Request Data
	 * @param res As Response Data
	 *
	 * @return null
	 */
	this.delete = (req, res)=>{
        let roleId	= (req.params.id) ? req.params.id : "";
		if(roleId){
            try{
                const admin_roles	= db.collection("admin_roles");
                admin_roles.deleteOne({_id: ObjectId(roleId)},(err, result) => {
                    if (!err) {
                        /** Send success response **/
                        req.flash(STATUS_SUCCESS, res.__("admin.admin_role.deleted_successfully"));
                        res.redirect(WEBSITE_ADMIN_URL + 'admin_role');
                    } else {
                        /** Send error response **/
                        req.flash(STATUS_ERROR, res.__("admin.system.something_going_wrong_please_try_again"));
                        res.redirect(WEBSITE_ADMIN_URL + 'admin_role');
                    }
                });
            }catch(e){
                /** Send error response **/
                req.flash(STATUS_ERROR,res.__("admin.system.something_going_wrong_please_try_again"));
                res.redirect(WEBSITE_ADMIN_URL+"admin_role");
            }
        }else{
            /** Send error response **/
            req.flash(STATUS_ERROR,res.__("admin.system.invalid_access"));
            res.redirect(WEBSITE_ADMIN_URL+"admin_role");
        }
	};//End delete()
}
module.exports = new Role();
