const asyncParallel	=	require('async/parallel');

function ContactUs() {

	/**
	 * Function to get  ContactUs list
	 *
	 * @param req 	As Request Data
	 * @param res 	As Response Data
	 *
	 * @return render/json
	 */
	this.getContactUsList = (req,res)=>{
		if(isPost(req)){
			let limit			 =	(req.body.length) ? parseInt(req.body.length) :ADMIN_LISTING_LIMIT;
			let skip			 = 	(req.body.start)  ? parseInt(req.body.start)  :DEFAULT_SKIP;
			const collection	 = 	db.collection('contact_us');

			/** Configure Datatable conditions*/
			configDatatable(req,res,null).then(dataTableConfig=>{
				dataTableConfig.conditions = Object.assign(dataTableConfig.conditions);

				asyncParallel({
					records :(callback)=>{
						/** Get list  **/
						collection.find(dataTableConfig.conditions,{projection: {_id:1,full_name:1,email:1,message:1,created:1}}).collation(COLLATION_VALUE).sort(dataTableConfig.sort_conditions).limit(limit).skip(skip).toArray((err, result)=>{
							callback(err, result);
						});  
					},
					total_records:(callback)=>{
						/** Get total number of records in  ContactUs collection **/
						collection.countDocuments({},(err,countResult)=>{
							callback(err, countResult);
						});
					},
					filter_records:(callback)=>{
						/** Get filtered records counting in  ContactUs **/
						collection.countDocuments(dataTableConfig.conditions,(err,filterContResult)=>{
							callback(err, filterContResult);
						});
					}
				},(err, response)=>{
					/** Send response **/
					res.send({
						status			: (!err) ? STATUS_SUCCESS : STATUS_ERROR,
						draw			: dataTableConfig.result_draw,
						data			: (response.records) ? response.records :[],
						recordsFiltered	: (response.filter_records) ? response.filter_records :0,
						recordsTotal	: (response.total_records) ? response.total_records :0
					});
				});
			});
		}else{
			/** render listing page **/
			req.breadcrumbs(BREADCRUMBS['admin/contact_us/list']);
			res.render('list');
		}
	};//End getContactUsList()

	/**
	 * Function to get  ContactUs detail
	 *
	 * @param req	As Request Data
	 * @param res	As Response Data
	 * @param next 	As Callback argument to the middleware function
	 *
	 * @return json
	 */
	this.getContactUsDetails = (req, res, next)=>{
		let ContactUsId =	(req.params.id)   ? req.params.id   :"";
		/** Get  ContactUs details **/
		const contact_us = db.collection('contact_us');
		contact_us.findOne({
			_id  : ObjectId(ContactUsId),
		},
		{projection: {
			_id:1,name:1,email:1,message:1,modified:1
		}},(err, result)=>{
			if(err) return next(err);
			/** Send error response */
			if(!result){
               	req.flash(STATUS_ERROR,res.__("admin.system.invalid_access"));
               	return res.redirect(WEBSITE_ADMIN_URL+"contact_us");
            }
			/** Send success response **/
			res.render("view",{
				status  : STATUS_SUCCESS,
                result  : result
            });
		});
	};// End getContactUsDetails()


	/**
	 * Function for delete ContactUs
	 *
	 * @param req 	As Request Data
	 * @param res 	As Response Data
	 * @param next 	As Callback argument to the middleware function
	 *
	 * @return render/json
	 */
	this.ContactUsDelete = (req, res, next)=>{
		let ContactUsId = 	(req.params.id)	? req.params.id	:"";
		/** Remove  ContactUs record **/
		const contact_us = db.collection('contact_us');
		contact_us.deleteOne({_id : ObjectId(ContactUsId)},(err)=>{
			if(err) return next(err);
			/** Send success response **/
			req.flash(STATUS_SUCCESS,res.__("admin.contact_us.contact_us_deleted_successfully"));
			res.redirect(WEBSITE_ADMIN_URL+"contact_us");
		});
	};//End ContactUsDelete()
}
module.exports = new  ContactUs();
