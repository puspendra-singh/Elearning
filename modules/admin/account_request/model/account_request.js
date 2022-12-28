const bcrypt        = require('bcryptjs');
const asyncParallel = require("async/parallel");
const crypto        = require("crypto");

function ExpertsRequest() {
    /**
     * Function for get list of users
     *
     * @param req As Request Data
     * @param res As Response Data
     *
     * @return render/json
     */
    this.getUserList = (req, res)=>{
        
        let userType        = (req.params.user_type)    ? req.params.user_type      : "";
        let statusType      = (req.params.status_type)  ? req.params.status_type    : "";
        let dateType        = (req.query.date)          ? req.query.date            : "";

        if(isPost(req)){

            let limit           = (req.body.length)         ? parseInt(req.body.length)         : ADMIN_LISTING_LIMIT;
            let skip            = (req.body.start)          ? parseInt(req.body.start)          : DEFAULT_SKIP;
            let fromDate        = (req.body.fromDate)       ? req.body.fromDate                 : "";
            let toDate          = (req.body.toDate)         ? req.body.toDate                   : "";
            let statusSearch    = (req.body.status_search)  ? parseInt(req.body.status_search)  : "";

            /** Configure DataTable conditions*/
            configDatatable(req,res,null).then(dataTableConfig=>{
                /** Set conditions **/
                let commonConditions = {
                    is_deleted  : NOT_DELETED,
                    role_id     : EXPERT_ROLE_ID,
                    is_approved : NOT_DELETED
                };     

                /** Conditions for date */
                if (fromDate != "" && toDate != "") {
                    dataTableConfig.conditions["created"] = {
                        $gte    : newDate(fromDate),
                        $lte    : newDate(toDate),
                    };
                }

                /** Conditions for search using status*/
                if (statusSearch != "") {
                    switch(statusSearch){

                        case SEARCHING_APPROVED:
                            dataTableConfig.conditions.is_approved  = SEARCHING_APPROVED;
                        break;

                        case SEARCHING_PENDING:
                            dataTableConfig.conditions.is_approved  = SEARCHING_PENDING;
                        break;

                        case SEARCHING_REJECTED:
                            dataTableConfig.conditions.is_approved  = SEARCHING_PENDING;
                        break;
                    }
                }

                dataTableConfig.conditions = Object.assign(dataTableConfig.conditions,commonConditions);
                const collection    = db.collection("users");
                asyncParallel([
                    (callback)=>{
                        /** Get list of user's **/
                        collection.find(dataTableConfig.conditions,{projection: {_id:1,full_name:1,email:1,is_approved:1,created:1}}).collation(COLLATION_VALUE).sort(dataTableConfig.sort_conditions).skip(skip).limit(limit).toArray((err, result)=>{
                            callback(err, result);
                        });
                    },
                    (callback)=>{
                        /** Get total number of records in users collection **/
                        collection.countDocuments(commonConditions,(err,countResult)=>{
                            callback(err, countResult);
                        });
                    },
                    (callback)=>{
                        /** Get filtered records couting in users **/
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
      
            /** render listing page **/
            req.breadcrumbs(BREADCRUMBS["admin/account_request/list"]);
            res.render("list");
        }
    };//End getUserList()

    /**
     * Function for view user's Detail
     *
     * @param req   As  Request Data
     * @param res   As  Response Data
     * @param next  As  Callback argument to the middleware function
     *
     * @return render
     */
    this.viewUserDetails = (req,res,next)=>{
        let userId      = (req.params.id)           ? req.params.id         : "";

        /*** Set conditions */
        let conditions =  {
            _id        : ObjectId(userId),
            role_id    : EXPERT_ROLE_ID,
        };

        /** Get User details **/
        const users = db.collection("users");
        users.aggregate([
            {$match : conditions},
        ]).toArray((err, results)=>{
            if(err) return next(err);
            let result = (results && results.length > 0 && results[0]) ? results[0] : null;
            if(!result){
                /** Send error response **/
                req.flash(STATUS_ERROR,res.__("admin.system.invalid_access"));
                res.redirect(WEBSITE_ADMIN_URL+"account_request/");
                return;
            }

            if(result && result.is_deleted == DELETED){
                /** Send error response **/
                req.flash(STATUS_ERROR,res.__("admin.user.this_user_is_deleted_from_the_system"));
                res.redirect(WEBSITE_ADMIN_URL+"account_request/");
                return;
            }

            /** Set options for append image full path **/
            let options = {
                "file_url"          : USERS_URL,
                "file_path"         : USERS_FILE_PATH,
                "result"            : [result],
                "database_field"    : "profile_image"
            };

            /** Append image with full path **/
            appendFileExistData(options).then(fileResponse=>{
                let finalResult = (fileResponse && fileResponse.result && fileResponse.result[0])   ?   fileResponse.result[0]  :{}
                /** Render view page*/
                req.breadcrumbs(BREADCRUMBS["admin/account_request/view"]);
                res.render("view",{
                    result  : finalResult,
                });
            }).catch(next);
        });
    };//End viewUserDetails()

    /**
     * Function for update user's approval status
     *
     * @param req   As Request Data
     * @param res   As Response Data
     * @param next  As  Callback argument to the middleware function
     *
     * @return null
     */
    this.updateUserAprrovalStatus = (req,res,next)=>{
        let userId      = (req.params.id)           ? req.params.id         : "";
        let userStatus  = (req.params.status)       ? parseInt(req.params.status)     : "";

        if(!userId || !userStatus){
            /** Send error response **/
            req.flash(STATUS_ERROR,res.__("admin.system.something_going_wrong_please_try_again"));
            res.redirect(WEBSITE_ADMIN_URL+"account_request");
            return;
        }

        /** Set update data **/
        let updateData = {modified  : getUtcDate(), is_approved : userStatus};

        /** Update user status*/
        const users = db.collection("users");
        users.updateOne({_id : ObjectId(userId)},{$set :updateData},(err,result)=>{
            if(err) return next(err);

            /**Send Mail to user according action taken on account */
            // let sendMailOptions = {
            //     event_type  : USER_ACCOUNT_APPROVAL_EMAIL_EVENTS,
            //     user_id     : userId,
            //     user_type   : EXPERT_ROLE_ID
            // };
            // sendMailToUsers(req,res,sendMailOptions);

            /** Send success response **/
            req.flash(STATUS_SUCCESS,res.__("admin.user.user_status_has_been_updated_successfully"));
            res.redirect(WEBSITE_ADMIN_URL+"account_request/");
        });
    };//End updateUserStatus()


    /**
     * Function for update user detail status
     *
     * @param req   As Request Data
     * @param res   As Response Data
     * @param next  As  Callback argument to the middleware function
     *
     * @return null
     */
    this.approveUserDetails = (req,res,next)=>{
        let userType    = (req.params.user_type)    ? req.params.user_type  : "";
        let action      = (req.params.action)       ? req.params.action : "";
        let userId      = (req.params.id)           ? req.params.id : "";

        /**set fields to approve driver details **/
        let updateFields  = {};
        if(action == USER_STATUS_APPROVED){
            updateFields = {
                approval_status     : USER_STATUS_APPROVED,
                modified            : getUtcDate()
            };
        }

        /**Set fields to rejects user details **/
        if(action == USER_STATUS_REJECTED){
            /** Sanitize Data **/
            req.body = sanitizeData(req.body,NOT_ALLOWED_TAGS_XSS);
            req.checkBody({
                "rejection_message": {
                    notEmpty: true,
                    isLength:{
                        options: {max:REJECTION_MESSAGE_TEXT_LENGTH},
                        errorMessage: res.__("admin.user.message_max_length",REJECTION_MESSAGE_TEXT_LENGTH)
                    },
                    errorMessage: res.__("admin.user.please_rejection_reason")
                },
            });
            let rejectionMessage = (req.body.rejection_message) ? req.body.rejection_message :'';

            /** parse Validation array  **/
            let errors = parseValidation(req.validationErrors(),req);
            if(errors) return res.send({status  : STATUS_ERROR,message  : errors});

            updateFields = {
                approval_status     : USER_STATUS_REJECTED,
                rejection_reason    : rejectionMessage,
                modified            : getUtcDate(),
            };
        }
        let dataToBeUpdated                                             = {$set : updateFields};
        if(action == USER_STATUS_APPROVED) dataToBeUpdated["$unset"]    = {rejection_reason : 1};

        const users = db.collection("users");
        users.updateOne({_id : ObjectId(userId)},dataToBeUpdated,(err,updateResult)=>{
            if(err) return next(err);

            /** if action type approved **/
            if(action == USER_STATUS_APPROVED){
                /** Send success response **/
                let redirectURL = (req.query.redirect) ? req.query.redirect : WEBSITE_ADMIN_URL+"users/"+ userType +"/view/"+userId;
                req.flash(STATUS_SUCCESS,res.__("admin.user.user_detail_has_been_approved"));
                res.redirect(redirectURL);
            }

            /** if action type rejected **/
            if(action == USER_STATUS_REJECTED){
                /** Send success response **/
                req.flash(STATUS_SUCCESS,res.__("admin.user.user_detail_has_been_rejected"));
                res.send({
                    status          : STATUS_SUCCESS,
                    redirect_url    : WEBSITE_ADMIN_URL+"users/view/"+userId
                });
            }
            /**Send Mail to user according action taken on account */
            let sendMailOptions = {
                event_type  : USER_ACCOUNT_APPROVAL_EMAIL_EVENTS,
                user_id     : userId,
                user_type   : userType
            };
            sendMailToUsers(req,res,sendMailOptions);
        });
    };//End approveUserDetails()

}
module.exports = new ExpertsRequest();
